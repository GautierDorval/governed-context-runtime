// SPDX-License-Identifier: Apache-2.0
import {PilotTechnicalError} from './pilot-execution.mjs';
import {assertValue, digestBytes, parseProviderJson} from './pilot-json.mjs';

// Explicit first-pilot profiles. Revalidate account availability, limits and prices before use.
export const PROVIDER_PROFILES = Object.freeze({
  anthropic: Object.freeze({model: 'claude-haiku-5-5', endpoint: 'https://api.anthropic.com/v1/messages', contextLimit: 1_000_000}),
  deepinfra: Object.freeze({model: 'deepseek-ai/DeepSeek-V3.2', endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions', contextLimit: 163_840}),
  mistral: Object.freeze({model: 'mistral-large-4-0', endpoint: 'https://api.mistral.ai/v1/chat/completions', contextLimit: 1_048_576}),
});
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
const MAX_BYTES = 1_048_576;
const nonnegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
function partialBytes(bytes, credential) {
  const preview = new TextDecoder().decode(bytes);
  const unescaped = preview.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16))).replace(/\\(["\\/])/g, '$1');
  if (preview.includes(credential) || unescaped.includes(credential)) return null;
  let binary = '';
  for (let at = 0; at < bytes.length; at += 8192) binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  return btoa(binary);
}

export function buildProviderRequest({provider, promptBytes, outputTokenLimit, role = 'respondent', systemInstruction = null}) {
  const profile = PROVIDER_PROFILES[provider];
  assertValue(profile && promptBytes instanceof Uint8Array, 'provider_profile');
  assertValue(['respondent', 'judge', 'preflight'].includes(role), 'provider_role');
  assertValue(Number.isSafeInteger(outputTokenLimit) && outputTokenLimit > 0 && outputTokenLimit <= 8192, 'output_limit');
  assertValue(role !== 'respondent' || (provider === 'anthropic' && outputTokenLimit === 512 && systemInstruction === null), 'respondent_contract');
  assertValue(systemInstruction === null || (typeof systemInstruction === 'string' && systemInstruction.isWellFormed()), 'system_instruction');
  const text = DECODER.decode(promptBytes);
  assertValue(promptBytes.length <= MAX_BYTES, 'input_size');
  // The assembled respondent prompt remains one user message, byte-for-byte after JSON decoding.
  // Documentation, evidence and conditions are never promoted to a system/developer message.
  const body = {model: profile.model, max_tokens: outputTokenLimit, stream: false, messages: [{role: 'user', content: text}]};
  if (provider === 'anthropic') {
    body.thinking = {type: 'disabled'};
    body.output_config = {effort: 'medium'};
    if (systemInstruction !== null) body.system = systemInstruction;
  } else {
    if (systemInstruction !== null) body.messages.unshift({role: 'system', content: systemInstruction});
    body.temperature = 0;
    body.top_p = 1;
    if (role === 'judge' || (role === 'preflight' && systemInstruction !== null)) body.response_format = {type: 'json_object'};
    if (provider === 'mistral') {
      body.reasoning_effort = 'high';
      body.service_tier = 'standard_only';
    }
  }
  return {provider, model: profile.model, url: profile.endpoint, role, outputTokenLimit, body: JSON.stringify(body)};
}

function usageFor(provider, data, outputTokenLimit) {
  const usage = data.usage;
  assertValue(usage && typeof usage === 'object', 'provider_usage');
  const input = provider === 'anthropic' ? usage.input_tokens : usage.prompt_tokens;
  const output = provider === 'anthropic' ? usage.output_tokens : usage.completion_tokens;
  assertValue(nonnegativeInteger(input) && nonnegativeInteger(output), 'provider_usage');
  let totalInput = input;
  if (provider === 'anthropic') {
    const read = usage.cache_read_input_tokens ?? 0;
    const created = usage.cache_creation_input_tokens ?? 0;
    assertValue(nonnegativeInteger(read) && created === 0, 'provider_cache_usage');
    totalInput += read;
    assertValue(!usage.server_tool_use || Object.values(usage.server_tool_use).every(value => value === 0), 'provider_tool_usage');
  } else {
    assertValue(usage.total_tokens === input + output, 'provider_usage_total');
    // Cached/reasoning tokens are subsets, never additional discounted or unbilled tokens.
    for (const [details, allowed, ceiling] of [
      [usage.prompt_tokens_details, ['cached_tokens'], input],
      [usage.completion_tokens_details, ['reasoning_tokens', 'accepted_prediction_tokens', 'rejected_prediction_tokens'], output],
    ]) if (details != null) {
      assertValue(typeof details === 'object' && !Array.isArray(details), 'provider_usage_details');
      for (const [key, count] of Object.entries(details)) {
        assertValue(allowed.includes(key) && nonnegativeInteger(count) && count <= ceiling, 'provider_usage_details');
        if (key.includes('prediction')) assertValue(count === 0, 'provider_prediction_usage');
      }
    }
  }
  assertValue(totalInput + output <= PROVIDER_PROFILES[provider].contextLimit && output <= outputTokenLimit, 'provider_usage_bounds');
  return {inputTokens: totalInput, outputTokens: output};
}

export function decodeProviderResponse(request, rawBody) {
  const data = parseProviderJson(rawBody);
  assertValue(data && data.model === request.model && typeof data.id === 'string' && data.id.length > 0, 'provider_response_identity');
  let rawText, finishReason, refusal = null;
  if (request.provider === 'anthropic') {
    assertValue(data.type === 'message' && data.role === 'assistant' && Array.isArray(data.content), 'provider_response_shape');
    assertValue(data.content.every(block => block?.type === 'text' && typeof block.text === 'string'), 'provider_unexpected_block');
    rawText = data.content.map(block => block.text).join('');
    finishReason = data.stop_reason;
    assertValue(['end_turn', 'max_tokens', 'refusal'].includes(finishReason), 'provider_finish_reason');
    if (finishReason === 'refusal') refusal = rawText;
  } else {
    assertValue(Array.isArray(data.choices) && data.choices.length === 1, 'provider_choices');
    const choice = data.choices[0];
    const message = choice.message;
    assertValue(choice.index === 0 && message?.role === 'assistant' && !message.tool_calls?.length && !message.function_call, 'provider_message');
    finishReason = choice.finish_reason;
    assertValue(['stop', 'length', 'content_filter'].includes(finishReason), 'provider_finish_reason');
    if (message.refusal != null) {
      assertValue(typeof message.refusal === 'string', 'provider_refusal');
      refusal = message.refusal;
    }
    if (typeof message.content === 'string') rawText = message.content;
    else if (Array.isArray(message.content)) {
      const texts = [];
      for (const block of message.content) {
        if (block?.type === 'text' && typeof block.text === 'string') texts.push(block.text);
        else assertValue(block?.type === 'thinking' && Array.isArray(block.thinking) && block.thinking.every(item => item?.type === 'text' && typeof item.text === 'string'), 'provider_unexpected_block');
      }
      rawText = texts.join('');
    } else {
      assertValue(message.content === null && (refusal !== null || finishReason === 'content_filter'), 'provider_content');
      rawText = '';
    }
    if (message.reasoning_content != null) assertValue(typeof message.reasoning_content === 'string', 'provider_reasoning');
  }
  const usage = usageFor(request.provider, data, request.outputTokenLimit);
  return {rawText, rawBody, finishReason, providerResponseId: data.id, model: data.model, usage, refusal, outputLimited: ['max_tokens', 'length'].includes(finishReason)};
}

/** Exactly one HTTP dispatch. The caller must durably reserve budget before invoking this. */
export async function sendProviderRequest({request, credential, fetchImplementation = fetch, timeoutMs = 90_000, signal}) {
  assertValue(PROVIDER_PROFILES[request.provider]?.endpoint === request.url && request.model === PROVIDER_PROFILES[request.provider].model, 'provider_endpoint');
  const supplied = parseProviderJson(request.body);
  const user = supplied?.messages?.filter(message => message.role === 'user');
  const system = request.provider === 'anthropic' ? supplied.system ?? null : supplied?.messages?.find(message => message.role === 'system')?.content ?? null;
  assertValue(user?.length === 1 && typeof user[0].content === 'string', 'provider_request');
  const expected = buildProviderRequest({provider: request.provider, promptBytes: ENCODER.encode(user[0].content), outputTokenLimit: request.outputTokenLimit, role: request.role, systemInstruction: system});
  assertValue(expected.body === request.body, 'provider_request_changed');
  assertValue(typeof credential === 'string' && credential.length >= 12 && /^[\x21-\x7e]+$/.test(credential), 'provider_credential');
  assertValue(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 120_000, 'provider_timeout');
  assertValue(!request.body.includes(credential), 'credential_echo');
  const bodyBytes = ENCODER.encode(request.body);
  const requestSha256 = await digestBytes(bodyBytes);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const combined = signal ? AbortSignal.any([signal, abort.signal]) : abort.signal;
  let receivedBytes = new Uint8Array(), rawBody = null, safeRawBody = null, status = null;
  try {
    const headers = {'Content-Type': 'application/json', 'Accept': 'application/json'};
    if (request.provider === 'anthropic') {
      headers['x-api-key'] = credential;
      headers['anthropic-version'] = '2023-06-01';
    } else headers.Authorization = `Bearer ${credential}`;
    const response = await fetchImplementation(request.url, {method: 'POST', headers, body: bodyBytes, redirect: 'manual', signal: combined});
    status = response.status;
    assertValue(!response.redirected && (!response.url || response.url === request.url), 'provider_redirect');
    const reader = response.body?.getReader();
    assertValue(reader, 'provider_body_missing');
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        assertValue(receivedBytes.length + value.length <= MAX_BYTES, 'provider_body_limit');
        const next = new Uint8Array(receivedBytes.length + value.length);
        next.set(receivedBytes); next.set(value, receivedBytes.length); receivedBytes = next;
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    rawBody = DECODER.decode(receivedBytes);
    // Never persist a credential, including when JSON escaping hides its literal bytes.
    assertValue(!rawBody.includes(credential), 'credential_echo');
    let parsed;
    try { parsed = parseProviderJson(rawBody); } catch {
      if (status !== 200) {
        const error = new PilotTechnicalError('', {code: `provider_http_${status}`, retryable: [408, 429, 500, 502, 503, 504, 529].includes(status), deliveryState: 'rejected'});
        error.partialResponseBase64 = partialBytes(receivedBytes, credential);
        throw error;
      }
      throw new TypeError('provider_json');
    }
    const containsSecret = value => typeof value === 'string' ? value.includes(credential) : value && typeof value === 'object' && Object.entries(value).some(([key, item]) => key.includes(credential) || containsSecret(item));
    assertValue(!containsSecret(parsed), 'credential_echo');
    safeRawBody = rawBody;
    if (status !== 200) {
      throw new PilotTechnicalError('', {code: `provider_http_${status}`, retryable: [408, 429, 500, 502, 503, 504, 529].includes(status), partialResponse: rawBody, deliveryState: 'rejected'});
    }
    const decoded = decodeProviderResponse(request, rawBody);
    return {...decoded, requestSha256, responseSha256: await digestBytes(receivedBytes)};
  } catch (error) {
    if (error instanceof PilotTechnicalError) throw error;
    // Library error messages and HTTP headers may include secrets. Keep a fixed code instead.
    const known = error instanceof TypeError && /^(provider_[a-z_]+|credential_echo)$/.test(error.message) ? error.message : 'transport_interrupted';
    const secretEcho = known === 'credential_echo';
    const partial = secretEcho ? null : safeRawBody;
    const result = new PilotTechnicalError('', {code: known, retryable: known === 'transport_interrupted' && !signal?.aborted, partialResponse: partial, deliveryState: status === 200 ? 'response_rejected' : 'unknown'});
    // Hashes identify retained bytes without exposing fragments containing unparsed credentials.
    result.requestSha256 = requestSha256;
    result.responseSha256 = secretEcho || !receivedBytes.length ? null : await digestBytes(receivedBytes);
    result.partialResponseBase64 = secretEcho ? null : partialBytes(receivedBytes, credential);
    throw result;
  } finally { clearTimeout(timer); }
}
