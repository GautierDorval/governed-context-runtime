// SPDX-License-Identifier: Apache-2.0
// Finite, request-scoped MCP response example. No discovery, fetch or reconnection.
// Transport JSON intentionally does not use the Runtime artifact numeric profile.

export const MCP_RESPONSE_LIMITS = Object.freeze({maxBytes: 1024 * 1024, timeoutMs: 10_000});

/** @param {string} code @returns {never} */
function refuse(code) {
  const error = new Error(code);
  error.name = 'McpResponseError';
  throw error;
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** @param {string} text @returns {unknown} */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return refuse('invalid_transport_json');
  }
}

/**
 * @typedef {{kind: 'result' | 'rpc-error', message: Record<string, unknown>,
 * notifications: Record<string, unknown>[], transport: string}} McpReply
 */

/**
 * Read a Response or an injected object with status, headers.get and a byte stream.
 * The byte limit covers consumed transport bytes, including comments/notifications.
 * The deadline starts here; callers own connection/header deadlines and redirects.
 * @param {{status: number, headers: {get(name: string): string | null},
 * body: ReadableStream<Uint8Array> | null}} response
 * @param {{requestId: string | number, maxBytes?: number, timeoutMs?: number}} options
 * @returns {Promise<McpReply>}
 */
export async function readMcpResponse(
  response,
  {requestId, maxBytes = MCP_RESPONSE_LIMITS.maxBytes, timeoutMs = MCP_RESPONSE_LIMITS.timeoutMs},
) {
  if (typeof requestId !== 'string' && !Number.isSafeInteger(requestId)) refuse('invalid_request_id');
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 2_147_483_647
  )
    refuse('invalid_response_limits');
  const transport = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!response.body) refuse('missing_response_body');
  const reader = response.body.getReader();
  const deadline = Date.now() + timeoutMs;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('response_timeout')), timeoutMs);
  });
  // An idle stream must not keep the caller waiting, including during cancellation.
  try {
    if (response.status < 200 || response.status >= 300) refuse('http_status_rejected');
    if (transport !== 'application/json' && transport !== 'text/event-stream') refuse('unsupported_content_type');
    const decoder = new TextDecoder('utf-8', {fatal: true});
    let size = 0,
      json = '',
      line = '',
      pendingCR = false,
      eventType = '';
    /** @type {string[]} */
    let data = [];
    /** @type {Record<string, unknown>[]} */
    const notifications = [];
    /** @param {string} text @returns {McpReply | undefined} */
    function message(text) {
      const value = parseJson(text);
      if (!record(value) || value.jsonrpc !== '2.0') refuse('invalid_jsonrpc_message');
      const hasResult = Object.hasOwn(value, 'result'),
        hasError = Object.hasOwn(value, 'error');
      if (Object.hasOwn(value, 'method')) {
        if (Object.hasOwn(value, 'id')) refuse('unsupported_server_request');
        if (typeof value.method !== 'string' || hasResult || hasError) refuse('invalid_jsonrpc_notification');
        notifications.push(value);
        return;
      }
      if (!Object.hasOwn(value, 'id') || hasResult === hasError) refuse('invalid_jsonrpc_response');
      if (value.id !== requestId) refuse('unexpected_response_id');
      if (
        hasError &&
        (!record(value.error) || !Number.isInteger(value.error.code) || typeof value.error.message !== 'string')
      )
        refuse('invalid_jsonrpc_error');
      return {kind: hasError ? 'rpc-error' : 'result', message: value, notifications, transport};
    }
    /** @param {string} current @returns {McpReply | undefined} */
    function consumeLine(current) {
      if (current === '') {
        const eventData = data;
        const type = eventType;
        data = [];
        eventType = '';
        if (!eventData.length) return;
        if (type !== '' && type !== 'message') refuse('unsupported_sse_event');
        return message(eventData.join('\n'));
      }
      if (current.startsWith(':')) return;
      const colon = current.indexOf(':');
      const field = colon < 0 ? current : current.slice(0, colon);
      let value = colon < 0 ? '' : current.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'data') data.push(value);
      else if (field === 'event') eventType = value;
      // id, retry and unknown fields never trigger reconnects or URL following.
    }
    while (true) {
      if (Date.now() >= deadline) refuse('response_timeout');
      let item;
      try {
        item = await Promise.race([reader.read(), expired]);
      } catch (error) {
        if (error instanceof Error && error.message === 'response_timeout') refuse('response_timeout');
        refuse('response_stream_error');
      }
      if (Date.now() >= deadline) refuse('response_timeout');
      let text;
      try {
        if (item.done) text = decoder.decode();
        else {
          if (!(item.value instanceof Uint8Array)) refuse('response_bytes_required');
          size += item.value.byteLength;
          if (size > maxBytes) refuse('response_size_limit');
          text = decoder.decode(item.value, {stream: true});
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'McpResponseError') throw error;
        refuse('invalid_response_utf8');
      }
      if (transport === 'application/json') json += text;
      else {
        // CR is a complete line ending immediately; skip a following LF even if
        // it arrives in a later chunk. A blank line alone dispatches an event.
        for (const char of text) {
          if (pendingCR) {
            pendingCR = false;
            if (char === '\n') continue;
          }
          if (char === '\r' || char === '\n') {
            const reply = consumeLine(line);
            line = '';
            pendingCR = char === '\r';
            if (reply) {
              if (Date.now() >= deadline) refuse('response_timeout');
              return reply;
            }
          } else line += char;
        }
      }
      if (item.done) {
        if (transport === 'application/json') {
          const reply = message(json);
          if (reply) {
            if (Date.now() >= deadline) refuse('response_timeout');
            return reply;
          }
        }
        // Pending SSE data is deliberately not dispatched on EOF.
        refuse('missing_final_response');
      }
    }
  } finally {
    clearTimeout(timer);
    // A hostile/incomplete cancellation promise cannot defeat the deadline.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/**
 * Extract only this example's single text-carried Runtime envelope. No URI is
 * followed; unknown result/content types and multi-round-trip requests stop here.
 * Decoding contentBase64 preserves artifact bytes; JSON is never reserialized.
 * This is transport extraction, not snapshot verification or a permission check.
 * @param {McpReply} reply
 */
export function extractMcpArtifact(reply) {
  if (reply.kind === 'rpc-error') return {status: 'rpc-error', error: reply.message.error};
  const result = reply.message.result;
  if (!record(result)) return {status: 'unsupported-result'};
  if (result.isError === true) return {status: 'tool-error', result};
  if ((Object.hasOwn(result, 'isError') && result.isError !== false) || result.resultType !== 'complete') {
    return {status: 'unsupported-result', result};
  }
  if (!Array.isArray(result.content) || result.content.length !== 1) return {status: 'unsupported-content', result};
  const content = result.content[0];
  if (!record(content) || content.type !== 'text' || typeof content.text !== 'string') {
    return {status: 'unsupported-content', result};
  }
  const envelope = parseJson(content.text);
  if (
    !record(envelope) ||
    typeof envelope.contentBase64 !== 'string' ||
    typeof envelope.artifactDigest !== 'string' ||
    !/^sha-256:[a-f0-9]{64}$/.test(envelope.artifactDigest)
  ) {
    refuse('unsupported_artifact_envelope');
  }
  const encoded = envelope.contentBase64;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    refuse('invalid_artifact_base64');
  }
  const artifactBytes = Buffer.from(encoded, 'base64');
  if (artifactBytes.toString('base64') !== encoded) refuse('invalid_artifact_base64');
  return {status: 'artifact', artifactBytes, envelope, contentText: content.text};
}
