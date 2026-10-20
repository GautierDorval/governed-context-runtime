// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {qualifyOffline, bindMcpPack, byteIdentity} from '../scripts/qualify-offline.mjs';
import {canonical, digest} from '../spec/reference/verification.mjs';
import {readMcpResponse} from '../spec/examples/read-mcp-response.mjs';

const base = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
const bundle = JSON.parse(await readFile(new URL('bundle.json', base), 'utf8'));
const anchor = JSON.parse(await readFile(new URL('expected-root.json', base), 'utf8'));
const selection = {intentToken: 'representation-gap', lang: 'fr', version: 'semantic-boundaries-1'};
const input = () => ({
  snapshotBytes: canonical(bundle.snapshot),
  expectedRoot: anchor.expectedRoot,
  expectedIntents: bundle.expectedIntents,
  selections: [selection],
  ...selection,
  getArchive: (/** @type {string} */ uri) => Buffer.from(bundle.archives[uri], 'base64'),
});

/** @param {Uint8Array} bytes @param {string} [root] @param {string} [declaredDigest] */
async function reply(bytes, root = anchor.expectedRoot, declaredDigest = undefined) {
  const envelope = {
    artifactDigest: declaredDigest ?? (await digest(bytes)),
    contentBase64: Buffer.from(bytes).toString('base64'),
    corpusRootDigest: root,
  };
  return readMcpResponse(
    new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        result: {resultType: 'complete', content: [{type: 'text', text: JSON.stringify(envelope)}]},
      }),
      {headers: {'content-type': 'application/json'}},
    ),
    {requestId: 7},
  );
}

test('qualification verifies all archives, exact selection and independent catalogue without granting permission', async () => {
  const result = await qualifyOffline(input());
  assert.equal(result.status, 'PASS');
  assert.equal(result.archiveReads.length, bundle.snapshot.inventory.items.length);
  assert.equal(result.selections.length, 1);
  assert.equal(result.independentlySuppliedCatalog, true);
  assert.equal(result.signatureTrust, 'not-established');
  assert.equal(result.usePermission, 'not-evaluated');
});
test('wrong pin refuses before reading any archive', async () => {
  let calls = 0;
  const result = await qualifyOffline({
    ...input(),
    expectedRoot: 'sha-256:' + '0'.repeat(64),
    getArchive: () => {
      calls++;
      throw Error('must not read');
    },
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'unexpected_corpus_root');
  assert.equal(calls, 0);
});
test('missing archive and unexpected reader failures remain distinct from integrity refusal', async () => {
  const missing = await qualifyOffline({
    ...input(),
    getArchive: () => {
      throw Object.assign(Error('absent'), {code: 'ENOENT'});
    },
  });
  assert.equal(missing.status, 'NOT_RUN');
  assert.equal(missing.reason, 'input_missing');
  const broken = await qualifyOffline({
    ...input(),
    getArchive: () => {
      throw new TypeError('reader bug');
    },
  });
  assert.equal(broken.status, 'ERROR');
  assert.equal(broken.reason, 'reader bug');
});
test('qualification passes original envelope bytes unchanged to the verifier', async () => {
  const uri = bundle.snapshot.inventory.items[0].uri;
  const raw = Buffer.concat([Buffer.from(bundle.archives[uri], 'base64'), Buffer.from('\n')]);
  const result = await qualifyOffline({
    ...input(),
    getArchive: path => (path === uri ? raw : input().getArchive(path)),
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason ?? '', /^archive-envelope:/);
  assert.deepEqual(
    result.archiveReads.find(item => item.uri === uri),
    {uri, ...byteIdentity(raw)},
  );
});
test('exact selection and supplied catalogue mismatches are propagated', async () => {
  const absent = await qualifyOffline({...input(), selections: [{...selection, version: 'absent'}]});
  assert.equal(absent.status, 'FAIL');
  assert.equal(absent.reason, 'exact_pack_not_found');
  const catalog = await qualifyOffline({...input(), expectedIntents: []});
  assert.equal(catalog.status, 'FAIL');
  assert.match(catalog.reason ?? '', /independent-intent-coverage/);
});
test('MCP bytes bind to both file and canonical digests of the admitted selected pack', async () => {
  const bytes = await readFile(new URL('fr.pack.json', base));
  const result = await bindMcpPack(await reply(bytes), input());
  assert.equal(result.status, 'PASS');
  assert.equal(result.fileBytesBound, true);
  assert.equal(result.canonicalContentBound, true);
});
test('MCP rejects inconsistent envelope digest, another valid pack, wrong root and wrong selection', async () => {
  const fr = await readFile(new URL('fr.pack.json', base)),
    en = await readFile(new URL('en.pack.json', base));
  await assert.rejects(
    () => reply(fr, anchor.expectedRoot, 'sha-256:' + '0'.repeat(64)).then(value => bindMcpPack(value, input())),
    /artifact_digest_mismatch/,
  );
  await assert.rejects(() => reply(en).then(value => bindMcpPack(value, input())), /selected_pack_content_mismatch/);
  await assert.rejects(
    () => reply(fr, 'sha-256:' + '0'.repeat(64)).then(value => bindMcpPack(value, input())),
    /transport_root_mismatch/,
  );
  await assert.rejects(
    () => reply(fr).then(value => bindMcpPack(value, {...input(), version: 'absent'})),
    /exact_pack_not_found/,
  );
  await assert.rejects(
    () => reply(Buffer.concat([fr, Buffer.from('\n')])).then(value => bindMcpPack(value, input())),
    /selected_pack_file_mismatch/,
  );
});
test('CLI writes only a new external report and exposes its four outcome classes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gcr-qualification-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const archives = join(directory, 'archives');
  await mkdir(archives);
  for (const [uri, encoded] of Object.entries(bundle.archives))
    await writeFile(
      join(archives, uri.split('/').at(-1) + '.json'),
      Buffer.from(/** @type {string} */ (encoded), 'base64'),
    );
  await writeFile(join(directory, 'snapshot.json'), canonical(bundle.snapshot));
  const config = {
    snapshotPath: 'snapshot.json',
    archivesDirectory: 'archives',
    expectedRoot: anchor.expectedRoot,
    rootProvenance: 'Separate fictional expected-root.json',
    selections: [selection],
  };
  const configPath = join(directory, 'config.json');
  await writeFile(configPath, JSON.stringify(config));
  const cli = fileURLToPath(new URL('../scripts/qualify-offline.mjs', import.meta.url));
  const execute = (/** @type {string} */ output) =>
    spawnSync(process.execPath, [cli, configPath, output], {encoding: 'utf8'});
  const output = join(directory, 'report.json');
  assert.equal(execute(output).status, 0);
  assert.equal(JSON.parse(await readFile(output, 'utf8')).status, 'PASS');
  assert.equal(execute(output).status, 4);
  assert.equal(execute(fileURLToPath(new URL('../forbidden-report.json', import.meta.url))).status, 4);
  await writeFile(configPath, JSON.stringify({...config, expectedRoot: 'sha-256:' + '0'.repeat(64)}));
  assert.equal(execute(join(directory, 'refused.json')).status, 2);
  await writeFile(configPath, JSON.stringify({...config, snapshotPath: 'missing.json'}));
  assert.equal(execute(join(directory, 'missing.json.report')).status, 3);
});

test('canonical serving is explicit, binds content and never silently normalizes received bytes', async () => {
  const fileBytes = await readFile(new URL('fr.pack.json', base));
  const servedBytes = canonical(JSON.parse(fileBytes.toString()));
  assert.notDeepEqual(Buffer.from(servedBytes), fileBytes);
  await assert.rejects(
    () => reply(servedBytes).then(value => bindMcpPack(value, input())),
    /selected_pack_file_mismatch/,
  );
  const result = await bindMcpPack(await reply(servedBytes), {...input(), artifactByteProfile: 'canonical-json'});
  assert.equal(result.canonicalContentBound, true);
  assert.equal(result.fileBytesBound, false);
  assert.deepEqual(result.artifact, byteIdentity(servedBytes));
  await assert.rejects(
    () =>
      reply(Buffer.concat([Buffer.from(servedBytes), Buffer.from('\n')])).then(value =>
        bindMcpPack(value, {...input(), artifactByteProfile: 'canonical-json'}),
      ),
    /noncanonical_served_pack/,
  );
});
