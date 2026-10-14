// SPDX-License-Identifier: Apache-2.0
// Fictional variants of the published synthetic bundle, for tests only. A caller edits source
// bytes and the inventory; seal() then recomputes the archives, item digests and the root, so a
// refusal can only come from the edited content, never from a stale digest.
import {readFile} from 'node:fs/promises';
import {canonical, digest, strictParse, verifySnapshot} from '../spec/reference/verification.mjs';

export const bundle = JSON.parse(await readFile(new URL('../spec/examples/synthetic/bundle.json', import.meta.url), 'utf8'));
export const encoder = new TextEncoder(), decoder = new TextDecoder();
export const registryPath = 'public/context-pack-registry.json';
export const pathOf = url => 'public' + new URL(url).pathname;

const baseSources = new Map(bundle.snapshot.inventory.items.map(item => {
  const archive = JSON.parse(Buffer.from(bundle.archives[item.uri], 'base64').toString('utf8'));
  return [item.sourcePath, Uint8Array.from(Buffer.from(archive.contentBase64, 'base64'))];
}));

export const sources = () => new Map(baseSources);
export const inventory = () => structuredClone(bundle.snapshot.inventory);
export const json = (sourceMap, path) => JSON.parse(decoder.decode(sourceMap.get(path)));
export const setJson = (sourceMap, path, value) => sourceMap.set(path, encoder.encode(JSON.stringify(value) + '\n'));

// Recomputes pack digests in the registry, the manifests and the inventory after payload edits.
export async function resealPacks(sourceMap, inv) {
  const registry = json(sourceMap, registryPath);
  for (const [position, pack] of registry.packs.entries()) {
    const payloadFile = pathOf(pack.payloadUrl), manifestFile = pathOf(pack.manifestUrl);
    const payloadRaw = sourceMap.get(payloadFile);
    pack.payloadFileDigest = await digest(payloadRaw);
    pack.payloadDigest = await digest(canonical(strictParse(payloadRaw), {historical: true, nfc: true}));
    const manifest = json(sourceMap, manifestFile);
    Object.assign(manifest, {payloadDigest: pack.payloadDigest, payloadFileDigest: pack.payloadFileDigest});
    setJson(sourceMap, manifestFile, manifest);
    pack.manifestFileDigest = await digest(sourceMap.get(manifestFile));
    pack.manifestDigest = await digest(canonical(manifest, {historical: true, nfc: true}));
    Object.assign(inv.packs[position], pack);
  }
  setJson(sourceMap, registryPath, registry);
}

// Re-archives every source, recomputes item digests and the root, and returns a verifiable snapshot.
export async function seal(sourceMap, inv) {
  const archives = new Map();
  for (const item of inv.items) {
    const data = sourceMap.get(item.sourcePath), repositoryDigest = await digest(data);
    const encoded = canonical({contentBase64: Buffer.from(data).toString('base64'), digest: repositoryDigest, digestAlgorithm: 'sha-256',
      digestScope: 'repository-bytes', encoding: 'base64', schemaVersion: '0.1.0-proposed', sourcePath: item.sourcePath, type: 'RuntimeSourceArchive'});
    const envelope = await digest(encoded);
    Object.assign(item, {repositoryDigest, version: repositoryDigest, byteLength: data.length, digest: envelope, uri: '/v0/artifacts/' + envelope.slice(8)});
    archives.set(item.uri, encoded);
  }
  const root = await digest(canonical(inv));
  const snapshot = {...bundle.snapshot, inventory: inv, corpusRootDigest: root, snapshotId: 'governed-context-runtime:' + root};
  const getArchive = async uri => { if (!archives.has(uri)) throw new Error('archive not captured'); return archives.get(uri); };
  return {snapshot, getArchive};
}

// Verifies a sealed variant against the bundle's independent intent list; returns the promise and the check log.
export function verify({snapshot, getArchive}) {
  const checks = [];
  return {result: verifySnapshot(snapshot, getArchive, bundle.expectedIntents, checks), checks};
}
