// SPDX-License-Identifier: Apache-2.0
// Complete-snapshot counterexamples under deliberately rebuilt roots, never a signature bypass.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {loadDemo} from '../examples/demo.mjs';
import {inspectVerifiedPack, consumeVerifiedPack} from '../examples/verified-pack.mjs';
import {inspectVerifiedUnit} from '../examples/verified-unit.mjs';
import {RECEIPT_TYPE} from './signatures.mjs';
import {canonical, digest, strictParse, verifySnapshot} from './verification.mjs';

const initial = await loadDemo();
const fields = [
  'contentBase64',
  'digest',
  'digestAlgorithm',
  'digestScope',
  'encoding',
  'schemaVersion',
  'sourcePath',
  'type',
];
const clone = () => structuredClone(initial);
const envelope = (b, index = 0) =>
  strictParse(Buffer.from(b.archives[b.snapshot.inventory.items[index].uri], 'base64'));
const reader = b => uri => Buffer.from(b.archives[uri], 'base64');
const verify = b => verifySnapshot(b.snapshot, reader(b), b.expectedIntents);
const error = message => ({name: 'VerificationError', message});
async function root(b) {
  b.snapshot.corpusRootDigest = await digest(canonical(b.snapshot.inventory));
  b.snapshot.snapshotId = 'governed-context-runtime:' + b.snapshot.corpusRootDigest;
}
async function replaceEnvelope(b, value, index = 0, raw = canonical(value)) {
  const item = b.snapshot.inventory.items[index];
  delete b.archives[item.uri];
  item.digest = await digest(raw);
  item.uri = '/v0/artifacts/' + item.digest.slice(8);
  b.archives[item.uri] = Buffer.from(raw).toString('base64');
  await root(b);
}
// A declared opaque source adds one archive to the otherwise complete historical graph.
// Its expected bytes and base64 come from literal vectors, not the verifier's encoder.
async function withBytes(bytes, contentBase64) {
  const b = clone();
  const sourcePath = 'public/fictional-p3-vector.bin';
  const repositoryDigest = await digest(bytes);
  const value = {
    type: 'RuntimeSourceArchive',
    schemaVersion: '0.1.0-proposed',
    sourcePath,
    encoding: 'base64',
    digestScope: 'repository-bytes',
    digestAlgorithm: 'sha-256',
    digest: repositoryDigest,
    contentBase64,
  };
  const raw = canonical(value),
    hash = await digest(raw),
    uri = '/v0/artifacts/' + hash.slice(8);
  b.snapshot.inventory.items.push({
    ...b.snapshot.inventory.items[0],
    sourcePath,
    repositoryDigest,
    version: repositoryDigest,
    byteLength: bytes.length,
    digest: hash,
    uri,
  });
  b.archives[uri] = Buffer.from(raw).toString('base64');
  await root(b);
  return b;
}
const packInput = b => ({
  snapshotBytes: canonical(b.snapshot),
  getArchive: reader(b),
  expectedRoot: b.snapshot.corpusRootDigest,
  expectedIntents: b.expectedIntents,
  intentToken: 'representation-gap',
  lang: 'en',
  version: b.snapshot.inventory.packs[0].version,
});
async function signedInput(b) {
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  const jwk = {...publicKey.export({format: 'jwk'}), kid: 'fictional-p3-key', alg: 'Ed25519', use: 'sig'};
  const policy = {
    ...structuredClone(b.policy),
    expectedRoot: b.snapshot.corpusRootDigest,
    allowedKids: [jwk.kid],
    keys: [{...b.policy.keys[0], jwk, jwkDigest: await digest(canonical(jwk))}],
  };
  const payload = strictParse(Buffer.from(b.receipt.payloadBase64, 'base64'));
  payload.corpusRootDigest = b.snapshot.corpusRootDigest;
  payload.snapshotId = b.snapshot.snapshotId;
  const bytes = Buffer.from(canonical(payload));
  const header = Buffer.from(canonical({alg: 'Ed25519', kid: jwk.kid, typ: RECEIPT_TYPE})).toString('base64url');
  const signature = sign(null, Buffer.from(header + '.' + bytes.toString('base64url')), privateKey).toString(
    'base64url',
  );
  return {
    ...packInput(b),
    policy,
    receipt: {payloadBase64: bytes.toString('base64'), detachedJws: header + '..' + signature},
  };
}

test('historical canonical envelope field set and complete graph remain valid', async () => {
  for (const item of initial.snapshot.inventory.items)
    assert.deepEqual(Object.keys(strictParse(Buffer.from(initial.archives[item.uri], 'base64'))).sort(), fields);
  assert((await verify(clone())).length > 0);
});

for (const [label, bytes, encoded] of [
  ['empty', [], ''],
  ['f', [102], 'Zg=='],
  ['fo', [102, 111], 'Zm8='],
  ['foo', [102, 111, 111], 'Zm9v'],
  ['foob', [102, 111, 111, 98], 'Zm9vYg=='],
  ['fooba', [102, 111, 111, 98, 97], 'Zm9vYmE='],
  ['foobar', [102, 111, 111, 98, 97, 114], 'Zm9vYmFy'],
  ['high byte', [255], '/w=='],
  ['binary zero and high bytes', [0, 255, 128], 'AP+A'],
  ['UTF-8 e acute', [195, 169], 'w6k='],
])
  test('canonical complete-snapshot base64 control: ' + label, async () => {
    const data = Uint8Array.from(bytes);
    assert.deepEqual(Buffer.from(encoded, 'base64'), Buffer.from(data));
    assert((await verify(await withBytes(data, encoded))).length > 0);
  });

for (const [key, value] of [
  ['extra', null],
  ['flag', false],
  ['count', 1],
  ['note', 'opaque'],
  ['nested', {version: 1}],
  ['list', []],
  ['__proto__', {allowed: true}],
  ['constructor', 'ignored'],
])
  test('unknown archive member refused: ' + key, async () => {
    const b = clone(),
      a = envelope(b);
    Object.defineProperty(a, key, {value, enumerable: true});
    await replaceEnvelope(b, a);
    await assert.rejects(() => verify(b), error('archive_fields'));
  });
for (const key of fields)
  test('missing archive member refused: ' + key, async () => {
    const b = clone(),
      a = envelope(b);
    delete a[key];
    await replaceEnvelope(b, a);
    await assert.rejects(() => verify(b), error('archive_fields'));
  });
test('same-size member substitution is refused, not just member count', async () => {
  const b = clone(),
    a = envelope(b);
  delete a.type;
  a.unrecognized = 'RuntimeSourceArchive';
  assert.equal(Object.keys(a).length, fields.length);
  await replaceEnvelope(b, a);
  await assert.rejects(() => verify(b), error('archive_fields'));
});
for (const value of [null, [], 'archive', 0, false])
  test('archive must be an object: ' + JSON.stringify(value), async () => {
    const b = clone();
    await replaceEnvelope(b, value);
    await assert.rejects(() => verify(b), error('archive_fields'));
  });

for (const tail of 'hijklmnopqrstuv')
  test('all nonzero four-bit pad aliases refused: Z' + tail + '==', async () => {
    const encoded = 'Z' + tail + '==';
    assert.deepEqual(Buffer.from(encoded, 'base64'), Buffer.from([102]));
    await assert.rejects(() => withBytes(Uint8Array.of(102), encoded).then(verify), error('noncanonical_base64'));
  });
for (const tail of '9+/')
  test('all nonzero two-bit pad aliases refused: Zm' + tail + '=', async () => {
    const encoded = 'Zm' + tail + '=';
    assert.deepEqual(Buffer.from(encoded, 'base64'), Buffer.from([102, 111]));
    await assert.rejects(() => withBytes(Uint8Array.of(102, 111), encoded).then(verify), error('noncanonical_base64'));
  });
for (const encoded of ['Zg', 'Zg===', 'Z-g=', 'Z_g=', 'Z g==', '=Zg=', 'Zg==x', 'Zg==\n'])
  test('base64 syntax or noncanonical spelling refused: ' + JSON.stringify(encoded), async () => {
    const b = await withBytes(Uint8Array.of(102), encoded);
    await assert.rejects(
      () => verify(b),
      e => e.name === 'VerificationError' && ['invalid_base64', 'noncanonical_base64'].includes(e.message),
    );
  });

test('raw byte digest still precedes the member-set check', async () => {
  const b = clone(),
    item = b.snapshot.inventory.items[0],
    a = envelope(b);
  a.extra = 'unadmitted';
  b.archives[item.uri] = Buffer.from(canonical(a)).toString('base64');
  await assert.rejects(() => verify(b), error('archive-envelope:' + item.sourcePath));
});
test('address still precedes the member-set check under a new root', async () => {
  const b = clone(),
    a = envelope(b);
  a.extra = true;
  await replaceEnvelope(b, a);
  const item = b.snapshot.inventory.items[0],
    bytes = b.archives[item.uri];
  delete b.archives[item.uri];
  item.uri = '/v0/artifacts/' + '0'.repeat(64);
  b.archives[item.uri] = bytes;
  await root(b);
  await assert.rejects(() => verify(b), error('archive-address:' + item.sourcePath));
});
test('noncanonical envelope bytes precede member-set rejection', async () => {
  const b = clone(),
    a = envelope(b);
  a.extra = true;
  await replaceEnvelope(b, a, 0, Buffer.from(JSON.stringify(a, null, 2)));
  await assert.rejects(() => verify(b), error('noncanonical_archive_envelope'));
});

async function fault(kind) {
  if (kind === 'padding') return withBytes(Uint8Array.of(102), 'Zh==');
  const b = clone(),
    a = envelope(b);
  a.extra = true;
  await replaceEnvelope(b, a);
  return b;
}
for (const kind of ['members', 'padding']) {
  const code = kind === 'members' ? 'archive_fields' : 'noncanonical_base64';
  test('original pinned root refuses before any archive read: ' + kind, async () => {
    const b = await fault(kind);
    let reads = 0;
    await assert.rejects(
      () =>
        inspectVerifiedPack({
          ...packInput(b),
          expectedRoot: initial.snapshot.corpusRootDigest,
          getArchive: () => {
            reads++;
            throw Error('unreachable');
          },
        }),
      error('unexpected_corpus_root'),
    );
    assert.equal(reads, 0);
  });
  test('unit and pack inspection share strict archive refusal: ' + kind, async () => {
    const b = await fault(kind);
    await assert.rejects(() => inspectVerifiedPack(packInput(b)), error(code));
    await assert.rejects(
      () => inspectVerifiedUnit({...packInput(b), unitBytes: canonical(b.snapshot.inventory.units[0])}),
      error(code),
    );
  });
  test('valid synthetic receipt cannot deliver a rejected archive: ' + kind, async () => {
    const b = await fault(kind);
    let calls = 0;
    const result = await consumeVerifiedPack(await signedInput(b), () => {
      calls++;
    });
    assert.equal(result.decision.decision, 'ACCEPTED_FOR_LOCAL_USE');
    assert.equal(result.status, 'REFUSED');
    assert.equal(result.stage, 'SNAPSHOT');
    assert.equal(result.reason, code);
    assert.equal(result.delivered, false);
    assert.equal(calls, 0);
    assert.equal(result.result, undefined);
    assert.equal(result.consumption, undefined);
  });
}
test('fresh synthetic signing control still delivers exactly once', async () => {
  let calls = 0;
  const result = await consumeVerifiedPack(await signedInput(clone()), pack => {
    calls++;
    return pack.pack.packId;
  });
  assert.equal(result.status, 'ACCEPTED_FOR_LOCAL_USE');
  assert.equal(result.delivered, true);
  assert.equal(calls, 1);
});
