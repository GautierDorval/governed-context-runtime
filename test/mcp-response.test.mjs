// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {readMcpResponse, extractMcpArtifact, MCP_RESPONSE_LIMITS} from '../spec/examples/read-mcp-response.mjs';

const textBytes = new TextEncoder();
const artifact = textBytes.encode('\uFEFF{ "accent": "e\u0301", "fraction": 1.25 }\r\n');
const artifactDigest = 'sha-256:' + createHash('sha256').update(artifact).digest('hex');
const envelope = {contentBase64: Buffer.from(artifact).toString('base64'), artifactDigest};
const complete = {resultType: 'complete', content: [{type: 'text', text: JSON.stringify(envelope)}]};
/** @param {unknown} result @param {string | number} [id] */
const rpc = (result = complete, id = 2) => ({jsonrpc: '2.0', id, result});
/** @param {string | Uint8Array} body @param {string} [type] */
const response = (body, type = 'application/json') => new Response(body, {headers: {'content-type': type}});
/** @param {unknown} value */
const readJson = value => readMcpResponse(response(JSON.stringify(value)), {requestId: 2});
/** @param {string} code */
const errorCode = code => (/** @type {unknown} */ error) => error instanceof Error && error.message === code;
/** @param {string} text @param {string} [type] */
function splitBytes(text, type = 'text/event-stream') {
  const bytes = textBytes.encode(text);
  let index = 0;
  return new Response(
    new ReadableStream({
      pull(controller) {
        if (index === bytes.length) controller.close();
        else controller.enqueue(bytes.slice(index, ++index));
      },
    }),
    {headers: {'content-type': type}},
  );
}

test('JSON and SSE return equivalent artifact bytes under the requested typed ID', async () => {
  const plain = await readJson(rpc());
  const streamed = await readMcpResponse(response('data: ' + JSON.stringify(rpc()) + '\n\n', 'text/event-stream'), {
    requestId: 2,
  });
  assert.deepEqual(plain.message, streamed.message);
  assert.equal(plain.transport, 'application/json');
  assert.equal(streamed.transport, 'text/event-stream');
  for (const reply of [plain, streamed]) {
    const extracted = extractMcpArtifact(reply);
    assert.equal(extracted.status, 'artifact');
    assert.deepEqual(extracted.artifactBytes, Buffer.from(artifact));
    assert.equal(
      createHash('sha256')
        .update(extracted.artifactBytes ?? '')
        .digest('hex'),
      artifactDigest.slice(8),
    );
    assert.equal(extracted.contentText, JSON.stringify(envelope));
  }
});

test('SSE handles BOM, comments, multiline data, CR, LF, CRLF and split UTF-8', async () => {
  const notification = {jsonrpc: '2.0', method: 'notifications/progress', params: {progress: 0.25, message: 'État 🧪'}};
  const body =
    '\uFEFF: keepalive\r\n\r\n' +
    'event: message\rid: ignored\rretry: 10\rx-extra: ignored\r' +
    'data: ' +
    JSON.stringify(notification) +
    '\r\r' +
    'data: {"jsonrpc":"2.0",\n' +
    'data: "id":2,\n' +
    'data: "result":' +
    JSON.stringify(complete) +
    '}\n\n';
  const reply = await readMcpResponse(splitBytes(body), {requestId: 2});
  assert.equal(reply.kind, 'result');
  assert.deepEqual(reply.notifications, [notification]);
  assert.deepEqual(reply.message, rpc());
});

test('transport JSON admits fractions outside the Runtime artifact numeric profile', async () => {
  const result = {resultType: 'complete', value: 1.25, temperature: -2.5e-3};
  const reply = await readJson(rpc(result));
  assert.deepEqual(reply.message.result, result);
});

test('RPC errors on HTTP success remain distinct from results and tool errors', async () => {
  const error = {code: -32601, message: 'Unknown method', data: {ratio: 0.5}};
  const reply = await readJson({jsonrpc: '2.0', id: 2, error});
  assert.equal(reply.kind, 'rpc-error');
  assert.deepEqual(extractMcpArtifact(reply), {status: 'rpc-error', error});
  const toolReply = await readJson(rpc({...complete, isError: true}));
  assert.equal(toolReply.kind, 'result');
  const tool = extractMcpArtifact(toolReply);
  assert.equal(tool.status, 'tool-error');
  assert.deepEqual(tool.result, {...complete, isError: true});
  assert.equal(tool.artifactBytes, undefined);
});

test('input-required and unknown results never become complete artifacts', async () => {
  for (const result of [
    {...complete, resultType: 'input_required', inputRequests: {login: {url: 'https://example.invalid/next'}}},
    {...complete, resultType: 'future-result'},
    {content: complete.content},
    {...complete, isError: 'false'},
    null,
  ]) {
    const extracted = extractMcpArtifact(await readJson(rpc(result)));
    assert.equal(extracted.status, 'unsupported-result');
    assert.equal(extracted.artifactBytes, undefined);
  }
});

test('unsupported content and multiple blocks are not followed or silently selected', async () => {
  for (const content of [
    [{type: 'resource_link', uri: 'https://example.invalid/pack'}],
    [{type: 'image', data: 'AA=='}],
    [...complete.content, ...complete.content],
    [],
  ]) {
    const extracted = extractMcpArtifact(await readJson(rpc({resultType: 'complete', content})));
    assert.equal(extracted.status, 'unsupported-content');
    assert.equal(extracted.artifactBytes, undefined);
  }
});

test('unexpected IDs are rejected without type coercion', async () => {
  for (const id of [3, '2', null]) {
    await assert.rejects(readJson({jsonrpc: '2.0', id, result: complete}), errorCode('unexpected_response_id'));
  }
  const reply = await readMcpResponse(response(JSON.stringify(rpc(complete, '2'))), {requestId: '2'});
  assert.equal(reply.message.id, '2');
});

test('malformed RPC envelopes and independent server requests are rejected', async () => {
  for (const value of [
    null,
    [],
    {id: 2, result: complete},
    {jsonrpc: '2.0', id: 2},
    {jsonrpc: '2.0', id: 2, result: complete, error: {code: 1, message: 'bad'}},
    {jsonrpc: '2.0', result: complete},
  ]) {
    await assert.rejects(readJson(value), /invalid_jsonrpc_/);
  }
  await assert.rejects(readJson({jsonrpc: '2.0', id: 2, error: {code: '1', message: 'bad'}}), /invalid_jsonrpc_error/);
  await assert.rejects(
    readJson({jsonrpc: '2.0', id: 2, method: 'sampling/createMessage'}),
    /unsupported_server_request/,
  );
});

test('HTML, absent content type and unsuccessful HTTP status fail closed', async () => {
  for (const type of ['text/html', '', 'application/octet-stream']) {
    await assert.rejects(
      readMcpResponse(response('<html>ok</html>', type), {requestId: 2}),
      /unsupported_content_type/,
    );
  }
  await assert.rejects(
    readMcpResponse(new Response('{}', {status: 404, headers: {'content-type': 'application/json'}}), {requestId: 2}),
    /http_status_rejected/,
  );
  const reply = await readMcpResponse(response(JSON.stringify(rpc()), 'Application/JSON; charset=utf-8'), {
    requestId: 2,
  });
  assert.equal(reply.kind, 'result');
});

test('malformed and incomplete UTF-8 fail explicitly for JSON and SSE', async () => {
  for (const type of ['application/json', 'text/event-stream']) {
    for (const bytes of [Uint8Array.of(0xc3, 0x28), Uint8Array.of(0xe2, 0x82)]) {
      await assert.rejects(readMcpResponse(response(bytes, type), {requestId: 2}), /invalid_response_utf8/);
    }
  }
});

test('EOF never dispatches an unfinished SSE result or turns a notification into a result', async () => {
  for (const body of [
    'data: ' + JSON.stringify(rpc()),
    'data: ' + JSON.stringify(rpc()) + '\n',
    ': comment only\n\n',
    'data: {"jsonrpc":"2.0","method":"notifications/progress"}\n\n',
  ]) {
    await assert.rejects(
      readMcpResponse(response(body, 'text/event-stream'), {requestId: 2}),
      /missing_final_response/,
    );
  }
  await assert.rejects(readJson({jsonrpc: '2.0', method: 'notifications/progress'}), /missing_final_response/);
});

test('unknown SSE event types and malformed event JSON are explicit failures', async () => {
  for (const [body, code] of [
    ['event: endpoint\ndata: https://example.invalid/\n\n', 'unsupported_sse_event'],
    ['data: {bad}\n\n', 'invalid_transport_json'],
    ['data\n\n', 'invalid_transport_json'],
  ]) {
    await assert.rejects(readMcpResponse(response(body, 'text/event-stream'), {requestId: 2}), errorCode(code));
  }
});

test('exact byte limit includes comments and a one-byte excess is rejected', async () => {
  const body = JSON.stringify(rpc());
  const length = textBytes.encode(body).length;
  assert.equal((await readMcpResponse(response(body), {requestId: 2, maxBytes: length})).kind, 'result');
  await assert.rejects(readMcpResponse(response(body), {requestId: 2, maxBytes: length - 1}), /response_size_limit/);
  const sse = ': padding\n\ndata: ' + body + '\n\n';
  await assert.rejects(readMcpResponse(splitBytes(sse), {requestId: 2, maxBytes: length}), /response_size_limit/);
  assert.equal(MCP_RESPONSE_LIMITS.maxBytes, 1_048_576);
  assert.equal(MCP_RESPONSE_LIMITS.timeoutMs, 10_000);
});

test('deadline and cancellation remain bounded on an idle stream', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    cancel() {
      cancelled = true;
      return new Promise(() => {});
    },
  });
  await assert.rejects(
    readMcpResponse(new Response(stream, {headers: {'content-type': 'text/event-stream'}}), {
      requestId: 2,
      timeoutMs: 15,
    }),
    /response_timeout/,
  );
  assert.equal(cancelled, true);
  assert.equal(stream.locked, false);
});

test('a complete SSE result stops a stream that does not close', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(textBytes.encode('data: ' + JSON.stringify(rpc()) + '\r\r'));
    },
    cancel() {
      cancelled = true;
    },
  });
  const reply = await readMcpResponse(new Response(stream, {headers: {'content-type': 'text/event-stream'}}), {
    requestId: 2,
  });
  assert.equal(reply.kind, 'result');
  assert.equal(cancelled, true);
  assert.equal(stream.locked, false);
});

test('stream errors release the reader and a subsequent valid response still succeeds', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.error(new Error('synthetic read failure'));
    },
  });
  await assert.rejects(
    readMcpResponse(new Response(stream, {headers: {'content-type': 'application/json'}}), {requestId: 2}),
    /response_stream_error/,
  );
  assert.equal(stream.locked, false);
  assert.equal((await readJson(rpc())).kind, 'result');
});

test('configuration and missing-body errors do not hang', async () => {
  for (const maxBytes of [0, -1, Infinity, 1.5]) {
    await assert.rejects(readMcpResponse(response('{}'), {requestId: 2, maxBytes}), /invalid_response_limits/);
  }
  for (const timeoutMs of [0, -1, Infinity, 2_147_483_648]) {
    await assert.rejects(readMcpResponse(response('{}'), {requestId: 2, timeoutMs}), /invalid_response_limits/);
  }
  await assert.rejects(readMcpResponse(response('{}'), {requestId: Number.MAX_SAFE_INTEGER + 1}), /invalid_request_id/);
  await assert.rejects(readMcpResponse(new Response(null), {requestId: 2}), /missing_response_body/);
});

test('artifact base64 is strict and never silently repaired', async () => {
  for (const contentBase64 of ['Zg', 'Zh==', 'Zg==\n', '!!!!']) {
    const text = JSON.stringify({...envelope, contentBase64});
    const reply = await readJson(rpc({...complete, content: [{type: 'text', text}]}));
    assert.throws(() => extractMcpArtifact(reply), /invalid_artifact_base64/);
  }
});

test('bilingual request snippets invoke the tested reader and keep request metadata coherent', async () => {
  for (const lang of ['fr', 'en']) {
    const guide = await readFile(new URL('../docs/' + lang + '/instance.md', import.meta.url), 'utf8');
    const section = guide.split('## 3. ')[1].split('\n## ')[0];
    assert(section.includes("'Accept' = 'application/json, text/event-stream'"));
    assert(section.includes("'MCP-Protocol-Version' = $mcpVersion"));
    assert(section.includes("'io.modelcontextprotocol/protocolVersion' = $mcpVersion"));
    assert(section.includes("'Mcp-Method': request.method"));
    assert(section.includes("headers['Mcp-Name'] = request.params.name"));
    assert(section.includes('readMcpResponse(response, {requestId: request.id})'));
    assert(section.includes('extractMcpArtifact(reply)'));
    assert(section.includes("redirect: 'error'"));
    assert(!section.includes('Invoke-RestMethod'));
  }
});

test('the documented Node program runs with injected JSON/SSE responses and coherent request headers', async () => {
  for (const lang of ['fr', 'en']) {
    const guide = await readFile(new URL('../docs/' + lang + '/instance.md', import.meta.url), 'utf8');
    const program = /\$readerScript = @'\n([\s\S]*?)\n'@/.exec(guide)?.[1];
    assert(program, 'documented Node program exists');
    const version = '2026-07-28';
    const meta = {
      'io.modelcontextprotocol/protocolVersion': version,
      'io.modelcontextprotocol/clientInfo': {name: 'runtime-reader', version: '0.1.0'},
      'io.modelcontextprotocol/clientCapabilities': {},
    };
    const requests = [
      {jsonrpc: '2.0', id: 1, method: 'server/discover', params: {_meta: meta}},
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          _meta: meta,
          name: 'get_context_pack',
          arguments: {
            intentToken: 'representation-gap',
            lang: 'fr',
            version: '0.1.0',
          },
        },
      },
    ];
    const headers = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': version,
    };
    const harness = `
      import assert from 'node:assert/strict';
      let calls = 0;
      globalThis.fetch = async (uri, init) => {
        assert.equal(uri, 'https://example.invalid/mcp');
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert(init.signal instanceof AbortSignal);
        const request = JSON.parse(init.body);
        assert.deepEqual(request, ${JSON.stringify(requests)}[calls]);
        assert.equal(init.headers.Accept, 'application/json, text/event-stream');
        assert.equal(init.headers['Content-Type'], 'application/json');
        assert.equal(init.headers['MCP-Protocol-Version'], request.params._meta['io.modelcontextprotocol/protocolVersion']);
        assert.equal(init.headers['Mcp-Method'], request.method);
        assert.equal(init.headers['Mcp-Name'], request.params.name);
        calls++;
        const body = JSON.stringify({jsonrpc:'2.0', id:request.id, result: calls === 1 ? {resultType:'complete'} : ${JSON.stringify(complete)}});
        return new Response(calls === 1 ? body : 'data: ' + body + '\\n\\n', {headers:{'content-type':calls === 1 ? 'application/json' : 'text/event-stream'}});
      };
    `;
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-',
        'https://example.invalid/mcp',
        JSON.stringify(headers),
        ...requests.map(value => JSON.stringify(value)),
      ],
      {
        input: harness + '\n' + program + '\nassert.equal(calls, 2);',
        cwd: new URL('../', import.meta.url),
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr);
    assert(child.stdout.includes(artifactDigest));
    assert(child.stdout.includes('snapshotVerified: false'));
  }
});
