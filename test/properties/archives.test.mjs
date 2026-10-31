// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {generateKeyPairSync, sign} from 'node:crypto';
import {bundle as fixture} from '../synthetic.mjs';
import {inspectVerifiedPack, consumeVerifiedPack} from '../../spec/examples/verified-pack.mjs';
import {canonical, digest, strictParse, verifySnapshot} from '../../spec/reference/verification.mjs';
// Protocol media type is an explicit fictional signing input, not a verifier oracle.
const RECEIPT_TYPE = 'application/vnd.gautierdorval.runtime-test-publication+json';
import {propertyTest} from './harness.mjs';
import {portableValue} from './arbitraries.mjs';
import {verificationError} from './oracles.mjs';
// Existing fictional bundle; all readers are injected and closed over local byte maps.
/** @typedef {import('../synthetic-types.d.mts').SyntheticBundle & {policy: {keys: Record<string,unknown>[], [key:string]:unknown}, receipt:{payloadBase64:string}}} Bundle */
const initial = /** @type {Bundle} */ (fixture);
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
const count = initial.snapshot.inventory.items.length;
/** @param {Bundle} b */
const reader = b => /** @param {string} uri */ uri => {
  if (!Object.hasOwn(b.archives, uri)) throw new Error('test requested an unknown local archive');
  return Buffer.from(b.archives[uri], 'base64');
};
/** @param {Bundle} b @param {number} index */
const envelope = (b, index) =>
  /** @type {Record<string,unknown>} */ (strictParse(reader(b)(b.snapshot.inventory.items[index].uri)));
/** @param {Bundle} b */
async function rebuildRoot(b) {
  b.snapshot.corpusRootDigest = await digest(canonical(b.snapshot.inventory));
  b.snapshot.snapshotId = 'governed-context-runtime:' + b.snapshot.corpusRootDigest;
}
/** Construction of synthetic roots, not a signature bypass or an independent canonical oracle.
 * @param {Bundle} b @param {number} index @param {unknown} value @param {Uint8Array} [raw] */
async function replaceEnvelope(b, index, value, raw = canonical(value)) {
  const item = b.snapshot.inventory.items[index];
  delete b.archives[item.uri];
  item.digest = await digest(raw);
  item.uri = '/v0/artifacts/' + item.digest.slice(8);
  b.archives[item.uri] = Buffer.from(raw).toString('base64');
  await rebuildRoot(b);
}
/** @param {Bundle} b */
const packInput = b => {
  const version = b.snapshot.inventory.packs[0].version;
  assert(typeof version === 'string');
  return {
    snapshotBytes: canonical(b.snapshot),
    getArchive: reader(b),
    expectedRoot: b.snapshot.corpusRootDigest,
    expectedIntents: b.expectedIntents,
    intentToken: 'representation-gap',
    lang: 'en',
    version,
  };
};
const {privateKey, publicKey} = generateKeyPairSync('ed25519');
const jwk = {...publicKey.export({format: 'jwk'}), kid: 'fictional-lot03-key', alg: 'Ed25519', use: 'sig'};
/** Locally generated fictional signing material. No production key, clock or network.
 * @param {Bundle} b */
async function signedInput(b) {
  const policy = {
    ...structuredClone(b.policy),
    expectedRoot: b.snapshot.corpusRootDigest,
    allowedKids: [jwk.kid],
    keys: [{...b.policy.keys[0], jwk, jwkDigest: await digest(canonical(jwk))}],
  };
  const payload = /** @type {Record<string,unknown>} */ (strictParse(Buffer.from(b.receipt.payloadBase64, 'base64')));
  payload.corpusRootDigest = b.snapshot.corpusRootDigest;
  payload.snapshotId = b.snapshot.snapshotId;
  const bytes = Buffer.from(canonical(payload));
  const header = Buffer.from(canonical({alg: 'Ed25519', kid: jwk.kid, typ: RECEIPT_TYPE})).toString('base64url');
  return {
    ...packInput(b),
    policy,
    receipt: {
      payloadBase64: bytes.toString('base64'),
      detachedJws:
        header +
        '..' +
        sign(null, Buffer.from(header + '.' + bytes.toString('base64url')), privateKey).toString('base64url'),
    },
  };
}
/** @param {Bundle} b @param {number} index @param {string} reason */
async function deepRefusal(b, index, reason) {
  /** @type {string[]} */
  const reads = [];
  const getArchive = /** @param {string} uri */ uri => {
    reads.push(uri);
    return reader(b)(uri);
  };
  await assert.rejects(() => verifySnapshot(b.snapshot, getArchive, b.expectedIntents), verificationError(reason));
  assert.equal(reads.length, index + 1, 'the announced archive position must actually be reached');
  assert.equal(reads.at(-1), b.snapshot.inventory.items[index].uri);
  if (b.snapshot.corpusRootDigest !== initial.snapshot.corpusRootDigest) {
    let oldReads = 0;
    await assert.rejects(
      () =>
        inspectVerifiedPack({
          ...packInput(b),
          expectedRoot: initial.snapshot.corpusRootDigest,
          getArchive: () => {
            oldReads++;
            throw Error('old trust root must refuse before retrieval');
          },
        }),
      verificationError('unexpected_corpus_root'),
    );
    assert.equal(oldReads, 0);
  }
  let calls = 0;
  const result = await consumeVerifiedPack(await signedInput(b), () => {
    calls++;
    return 'must not be delivered';
  });
  assert.equal(result.status, 'REFUSED');
  assert.equal(result.stage, 'SNAPSHOT');
  assert.equal(result.reason, reason);
  assert.equal(result.delivered, false);
  assert.equal(calls, 0);
  assert.equal('result' in result, false);
}
/** @param {string} id @param {number} seed @param {number} [runs] */
const meta = (id, seed, runs = 20) => ({
  id,
  seed,
  runs,
  profile: 'gd-portable-json-v1 archive / fictional consumption',
});
propertyTest(
  meta('archive-valid-controls', 31300, 1),
  fc.asyncProperty(fc.constant(null), async () => {
    assert((await verifySnapshot(initial.snapshot, reader(initial), initial.expectedIntents)).length > 0);
    for (const lang of ['fr', 'en']) {
      let calls = 0;
      const result = await consumeVerifiedPack({...(await signedInput(clone())), lang}, () => {
        calls++;
        return 'delivered once';
      });
      assert.equal(result.delivered, true);
      assert.equal(calls, 1);
      assert.equal(result.consumption, 'delivered once');
    }
  }),
);
propertyTest(
  meta('archive-member-set', 31301),
  fc.asyncProperty(
    fc.integer({min: 0, max: count - 1}),
    fc.constantFrom('extra', 'missing', 'replace'),
    fc.constantFrom(...fields),
    portableValue,
    async (index, kind, key, value) => {
      const b = clone(),
        a = envelope(b, index),
        before = Object.keys(a).length;
      if (kind !== 'extra') delete a[key];
      if (kind !== 'missing') a.unadmitted = value;
      if (kind === 'replace') assert.equal(Object.keys(a).length, before);
      await replaceEnvelope(b, index, a);
      await deepRefusal(b, index, 'archive_fields');
    },
  ),
);
propertyTest(
  meta('archive-envelope-bytes', 31302),
  fc.asyncProperty(fc.integer({min: 0, max: count - 1}), fc.boolean(), async (index, spacing) => {
    const b = clone(),
      a = envelope(b, index);
    const raw = Buffer.from(
      spacing ? ' ' + JSON.stringify(a) : JSON.stringify(Object.fromEntries(Object.entries(a).reverse())),
    );
    assert.notDeepEqual(Uint8Array.from(raw), canonical(a));
    await replaceEnvelope(b, index, a, raw);
    await deepRefusal(b, index, 'noncanonical_archive_envelope');
  }),
);
propertyTest(
  meta('archive-address-length', 31303),
  fc.asyncProperty(
    fc.integer({min: 0, max: count - 1}),
    fc.constantFrom('address', 'length', 'digest'),
    async (index, kind) => {
      const b = clone(),
        item = b.snapshot.inventory.items[index];
      let reason;
      if (kind === 'address') {
        const raw = b.archives[item.uri];
        delete b.archives[item.uri];
        item.uri = '/v0/artifacts/' + '0'.repeat(64);
        b.archives[item.uri] = raw;
        reason = 'archive-address:' + item.sourcePath;
      } else if (kind === 'length') {
        item.byteLength++;
        reason = 'source-length:' + item.sourcePath;
      } else {
        b.archives[item.uri] = Buffer.concat([reader(b)(item.uri), Buffer.from(' ')]).toString('base64');
        reason = 'archive-envelope:' + item.sourcePath;
      }
      await rebuildRoot(b);
      await deepRefusal(b, index, reason);
    },
  ),
);
/** @param {number[]} data @param {string} encoded @param {number} nonce */
async function opaque(data, encoded, nonce) {
  const b = clone(),
    sourcePath = 'public/fictional-lot03-' + nonce + '.bin',
    repositoryDigest = await digest(Uint8Array.from(data));
  const a = {
    type: 'RuntimeSourceArchive',
    schemaVersion: '0.1.0-proposed',
    sourcePath,
    encoding: 'base64',
    digestScope: 'repository-bytes',
    digestAlgorithm: 'sha-256',
    digest: repositoryDigest,
    contentBase64: encoded,
  };
  const raw = canonical(a),
    hash = await digest(raw),
    uri = '/v0/artifacts/' + hash.slice(8);
  b.snapshot.inventory.items.push({
    ...b.snapshot.inventory.items[0],
    sourcePath,
    repositoryDigest,
    version: repositoryDigest,
    byteLength: data.length,
    digest: hash,
    uri,
  });
  b.archives[uri] = Buffer.from(raw).toString('base64');
  await rebuildRoot(b);
  return b;
}
propertyTest(
  meta('archive-base64', 31304),
  fc.asyncProperty(fc.integer({min: 1, max: 15}), fc.boolean(), fc.nat({max: 100000}), async (bits, two, nonce) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const data = two ? [102, 111] : [102],
      valid = two ? 'Zm8=' : 'Zg==',
      alias = two ? 'Zm' + alphabet[60 + (bits % 3) + 1] + '=' : 'Z' + alphabet[32 + bits] + '==';
    assert.deepEqual(Buffer.from(alias, 'base64'), Buffer.from(data));
    const b = await opaque(data, valid, nonce);
    assert((await verifySnapshot(b.snapshot, reader(b), b.expectedIntents)).length > 0);
    const index = b.snapshot.inventory.items.length - 1,
      a = envelope(b, index);
    a.contentBase64 = alias;
    await replaceEnvelope(b, index, a);
    await deepRefusal(b, index, 'noncanonical_base64');
  }),
);
propertyTest(
  meta('archive-fixed-boundaries', 31305, 1),
  fc.asyncProperty(fc.constant(null), async () => {
    for (const index of [0, count - 1]) {
      const b = clone(),
        a = envelope(b, index);
      delete a.type;
      a.unadmitted = 'same cardinality';
      await replaceEnvelope(b, index, a);
      await deepRefusal(b, index, 'archive_fields');
    }
    for (const alias of ['Zh==', 'Zv==', 'Zm9=', 'Zm/=']) {
      const b = await opaque(alias.length === 4 && alias.endsWith('==') ? [102] : [102, 111], alias, 99);
      await deepRefusal(b, b.snapshot.inventory.items.length - 1, 'noncanonical_base64');
    }
  }),
);
