// SPDX-License-Identifier: Apache-2.0
// Fictional variants of the published synthetic bundle, for tests only. A caller edits source
// bytes and the inventory; seal() then recomputes the archives, item digests and the root, so a
// refusal can only come from the edited content, never from a stale digest.
import {readFile} from 'node:fs/promises';
import {canonical, digest, strictParse, verifySnapshot} from '../spec/reference/verification.mjs';
/** @import {Check, ContextPackManifest, Inventory, PackEntry, Sealed, SyntheticBundle} from './synthetic-types.d.mts' */

/** @type {SyntheticBundle} */
export const bundle = JSON.parse(
  await readFile(new URL('../spec/examples/synthetic/bundle.json', import.meta.url), 'utf8'),
);
export const encoder = new TextEncoder(),
  decoder = new TextDecoder();
export const registryPath = 'public/context-pack-registry.json';
/** @param {string} url */
export const pathOf = url => 'public' + new URL(url).pathname;

/** @typedef {Map<string, Uint8Array>} SourceMap */

/** @type {SourceMap} */
const baseSources = new Map(
  bundle.snapshot.inventory.items.map(item => {
    const archive = JSON.parse(Buffer.from(bundle.archives[item.uri], 'base64').toString('utf8'));
    return [item.sourcePath, Uint8Array.from(Buffer.from(archive.contentBase64, 'base64'))];
  }),
);

/** @returns {SourceMap} */
export const sources = () => new Map(baseSources);
/** @returns {Inventory} */
export const inventory = () => structuredClone(bundle.snapshot.inventory);
/**
 * Parses a source of the map, typed with the shape that the calling test reads or edits.
 * @template T
 * @param {SourceMap} sourceMap
 * @param {string} path
 * @returns {T}
 */
export const json = (sourceMap, path) => JSON.parse(decoder.decode(sourceMap.get(path)));
/** @param {SourceMap} sourceMap @param {string} path @param {unknown} value */
export const setJson = (sourceMap, path, value) => sourceMap.set(path, encoder.encode(JSON.stringify(value) + '\n'));

/**
 * Recomputes pack digests in the registry, the manifests and the inventory after payload edits.
 * @param {SourceMap} sourceMap
 * @param {Inventory} inv
 */
export async function resealPacks(sourceMap, inv) {
  /** @type {{packs: PackEntry[]}} */
  const registry = json(sourceMap, registryPath);
  for (const [position, pack] of registry.packs.entries()) {
    const payloadFile = pathOf(pack.payloadUrl),
      manifestFile = pathOf(pack.manifestUrl);
    const payloadRaw = source(sourceMap, payloadFile);
    pack.payloadFileDigest = await digest(payloadRaw);
    pack.payloadDigest = await digest(canonical(strictParse(payloadRaw), {historical: true, nfc: true}));
    /** @type {ContextPackManifest} */
    const manifest = json(sourceMap, manifestFile);
    Object.assign(manifest, {payloadDigest: pack.payloadDigest, payloadFileDigest: pack.payloadFileDigest});
    setJson(sourceMap, manifestFile, manifest);
    pack.manifestFileDigest = await digest(source(sourceMap, manifestFile));
    pack.manifestDigest = await digest(canonical(manifest, {historical: true, nfc: true}));
    Object.assign(inv.packs[position], pack);
  }
  setJson(sourceMap, registryPath, registry);
}

/** @param {SourceMap} sourceMap @param {string} path */
function source(sourceMap, path) {
  const data = sourceMap.get(path);
  if (!data) throw new Error('not a source of the synthetic bundle: ' + path);
  return data;
}

/**
 * Re-archives every source, recomputes item digests and the root, and returns a verifiable snapshot.
 * @param {SourceMap} sourceMap
 * @param {Inventory} inv
 * @returns {Promise<Sealed>}
 */
export async function seal(sourceMap, inv) {
  /** @type {Map<string, Uint8Array<ArrayBuffer>>} */
  const archives = new Map();
  for (const item of inv.items) {
    const data = source(sourceMap, item.sourcePath),
      repositoryDigest = await digest(data);
    const encoded = canonical({
      contentBase64: Buffer.from(data).toString('base64'),
      digest: repositoryDigest,
      digestAlgorithm: 'sha-256',
      digestScope: 'repository-bytes',
      encoding: 'base64',
      schemaVersion: '0.1.0-proposed',
      sourcePath: item.sourcePath,
      type: 'RuntimeSourceArchive',
    });
    const envelope = await digest(encoded);
    Object.assign(item, {
      repositoryDigest,
      version: repositoryDigest,
      byteLength: data.length,
      digest: envelope,
      uri: '/v0/artifacts/' + envelope.slice(8),
    });
    archives.set(item.uri, encoded);
  }
  const root = await digest(canonical(inv));
  const snapshot = {
    ...bundle.snapshot,
    inventory: inv,
    corpusRootDigest: root,
    snapshotId: 'governed-context-runtime:' + root,
  };
  /** @param {string} uri */
  const getArchive = async uri => {
    const encoded = archives.get(uri);
    if (!encoded) throw new Error('archive not captured');
    return encoded;
  };
  return {snapshot, getArchive};
}

/**
 * Verifies a sealed variant against the bundle's independent intent list; returns the promise and the check log.
 * @param {Sealed} sealed
 */
export function verify({snapshot, getArchive}) {
  /** @type {Check[]} */
  const checks = [];
  // @ts-expect-error verification.mjs accepts a fourth `checks` argument that verification.d.mts does not declare yet (declaration patch P-01).
  const result = verifySnapshot(snapshot, getArchive, bundle.expectedIntents, checks);
  return {result, checks};
}
