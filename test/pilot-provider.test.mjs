// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProviderRequest,
  sendProviderRequest,
  decodeProviderResponse,
} from '../spec/examples/semantic-boundaries/pilot-provider.mjs';
import {parseProviderJson} from '../spec/examples/semantic-boundaries/pilot-json.mjs';

const credential = 'synthetic-not-a-live-key';
const bytes = new TextEncoder().encode(
  'Instruction\n<documentation>\n\ufefftexte\r\n</documentation>\n<case>{"evidence":[],"question":"Q?"}</case>',
);
const request = buildProviderRequest({provider: 'anthropic', promptBytes: bytes, outputTokenLimit: 512});
function body(text = 'Réponse', tokens = 3) {
  return {
    id: 'msg_synthetic',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [{type: 'text', text}],
    stop_reason: 'end_turn',
    usage: {input_tokens: 100, output_tokens: tokens},
  };
}
/** @param {unknown} payload @param {number} [status] @returns {typeof fetch} */
const fake =
  (payload, status = 200) =>
  async () =>
    new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {status});

test('respondent request preserves exact prompt, roles and fixed output ceiling', () => {
  const sent = JSON.parse(request.body);
  assert.deepEqual(new TextEncoder().encode(sent.messages[0].content), bytes);
  assert.deepEqual(
    sent.messages.map(/** @param {{role:string}} x */ x => x.role),
    ['user'],
  );
  for (const forbidden of ['system', 'tools', 'seed', 'temperature', 'top_p', 'metadata'])
    assert(!Object.hasOwn(sent, forbidden));
  assert.deepEqual(sent.thinking, {type: 'disabled'});
  assert.equal(sent.max_tokens, 512);
  assert.throws(
    () => buildProviderRequest({provider: 'anthropic', promptBytes: bytes, outputTokenLimit: 513}),
    /respondent_contract/,
  );
});

test('no unexpected request field, model, system elevation or output limit reaches HTTP', async () => {
  for (const field of ['model', 'max_tokens', 'tools', 'system']) {
    const payload = JSON.parse(request.body);
    payload[field] = field === 'max_tokens' ? 8000 : 'changed';
    let calls = 0;
    await assert.rejects(
      sendProviderRequest({
        request: {...request, body: JSON.stringify(payload)},
        credential,
        fetchImplementation: async () => {
          calls++;
          return new Response();
        },
      }),
    );
    assert.equal(calls, 0);
  }
});

test('completed empty, whitespace, U+200B, refusal and ceiling replies preserve raw content', async () => {
  for (const rawText of ['', ' \r\n', '\u200b', 'Je refuse.']) {
    const payload = body(rawText, rawText ? 3 : 0);
    payload.stop_reason = rawText === 'Je refuse.' ? 'refusal' : 'max_tokens';
    const result = await sendProviderRequest({request, credential, fetchImplementation: fake(payload)});
    assert.equal(result.rawText, rawText);
    assert.equal(result.rawBody, JSON.stringify(payload));
    assert.equal(result.outputLimited, payload.stop_reason === 'max_tokens');
    assert.match(result.requestSha256, /^[a-f0-9]{64}$/);
    assert.match(result.responseSha256, /^[a-f0-9]{64}$/);
  }
});

test('HTTP transient failure is a single dispatch, retained without semantic relabeling', async () => {
  let calls = 0;
  try {
    await sendProviderRequest({
      request,
      credential,
      fetchImplementation: async () => {
        calls++;
        return new Response('{"error":{"message":""}}', {status: 429});
      },
    });
    assert.fail('expected a technical error');
  } catch (error) {
    const value =
      /** @type {import('../spec/examples/semantic-boundaries/pilot-execution.mjs').PilotTechnicalError} */ (error);
    assert.equal(value.message, '');
    assert.equal(value.code, 'provider_http_429');
    assert.equal(value.retryable, true);
    assert.equal(value.partialResponse, '{"error":{"message":""}}');
  }
  assert.equal(calls, 1);
});

test('non-JSON 503 and an interrupted body retain exact partial bytes', async () => {
  const response = new Response('upstream unavailable', {status: 503});
  await assert.rejects(sendProviderRequest({request, credential, fetchImplementation: async () => response}), error => {
    const value = /** @type {Error & {code:string;retryable:boolean;partialResponseBase64:string}} */ (error);
    assert.equal(value.code, 'provider_http_503');
    assert(value.retryable);
    assert.equal(Buffer.from(value.partialResponseBase64, 'base64').toString(), 'upstream unavailable');
    return true;
  });
  let chunks = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (!chunks++) controller.enqueue(new TextEncoder().encode('{"partial":"'));
      else controller.error(new Error('network error with private diagnostics'));
    },
  });
  await assert.rejects(
    sendProviderRequest({request, credential, fetchImplementation: async () => new Response(stream)}),
    error => {
      const value = /** @type {Error & {code:string;partialResponseBase64:string}} */ (error);
      assert.equal(value.code, 'transport_interrupted');
      assert.equal(value.message, '');
      assert.equal(Buffer.from(value.partialResponseBase64, 'base64').toString(), '{"partial":"');
      return true;
    },
  );
});

test('credential echoes, including JSON escaped echoes, leave no retained body', async () => {
  for (const raw of [
    JSON.stringify(body(credential)),
    JSON.stringify(body(credential)).replaceAll('synthetic', '\\u0073ynthetic'),
  ]) {
    await assert.rejects(sendProviderRequest({request, credential, fetchImplementation: fake(raw)}), error => {
      const value = /** @type {Error & {code:string;partialResponse:string|null;partialResponseBase64:string|null}} */ (
        error
      );
      assert.equal(value.code, 'credential_echo');
      assert.equal(value.partialResponse, null);
      assert.equal(value.partialResponseBase64, null);
      assert(!JSON.stringify(error).includes(credential));
      return true;
    });
  }
});

test('model, usage, tool and finish mismatches fail closed', () => {
  for (const mutate of [
    /** @param {any} p */ p => {
      p.model = 'other';
    },
    /** @param {any} p */ p => {
      p.usage.output_tokens = 513;
    },
    /** @param {any} p */ p => {
      p.usage.cache_creation_input_tokens = 1;
    },
    /** @param {any} p */ p => {
      p.content = [{type: 'tool_use', id: 'unrequested'}];
    },
    /** @param {any} p */ p => {
      p.stop_reason = null;
    },
  ]) {
    const payload = body();
    mutate(payload);
    assert.throws(() => decodeProviderResponse(request, JSON.stringify(payload)), /provider_/);
  }
});

test('provider JSON rejects duplicate keys, invalid Unicode and nonfinite or unsafe numbers', () => {
  for (const raw of [
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"a":"\\ud800"}',
    '{"a":1e400}',
    '{"a":9007199254740993}',
    '[1,]',
  ])
    assert.throws(() => parseProviderJson(raw));
  assert.equal(parseProviderJson('{"optional_cost":0.0000001,"usage":100}').usage, 100);
});

test('Mistral text blocks exclude thinking from evaluated text and account for all output tokens', () => {
  const judge = buildProviderRequest({
    provider: 'mistral',
    promptBytes: bytes,
    outputTokenLimit: 8192,
    role: 'judge',
    systemInstruction: 'Return JSON.',
  });
  const sent = JSON.parse(judge.body);
  assert.equal(sent.service_tier, 'standard_only');
  assert.equal(sent.top_p, 1);
  const payload = {
    id: 'synthetic',
    model: judge.model,
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: [
            {type: 'thinking', thinking: [{type: 'text', text: 'not evaluated'}]},
            {type: 'text', text: '{"ok":true}'},
          ],
        },
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
      completion_tokens_details: {reasoning_tokens: 40},
    },
  };
  const result = decodeProviderResponse(judge, JSON.stringify(payload));
  assert.equal(result.rawText, '{"ok":true}');
  assert.deepEqual(result.usage, {inputTokens: 100, outputTokens: 50});
  payload.usage.total_tokens++;
  assert.throws(() => decodeProviderResponse(judge, JSON.stringify(payload)), /usage_total/);
});

test('redirect is never followed and a body exceeding the limit is rejected', async () => {
  await assert.rejects(
    sendProviderRequest({
      request,
      credential,
      fetchImplementation: async (_url, init) => {
        assert.equal(init?.redirect, 'manual');
        return new Response(null, {status: 307, headers: {Location: 'https://untrusted.invalid'}});
      },
    }),
  );
  await assert.rejects(
    sendProviderRequest({request, credential, fetchImplementation: fake('x'.repeat(1_048_577))}),
    /./,
  );
});
