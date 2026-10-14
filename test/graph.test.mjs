// SPDX-License-Identifier: Apache-2.0
// Exercises graph construction in verifySnapshot, which the published fixture (empty graph) never
// reached. A fictional variant is rebuilt from the fixture: payload edited, then pack digests,
// manifest, registry, archives and root recomputed. Expected nodes are written out by hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonical, digest, strictParse, verifySnapshot} from '../spec/reference/verification.mjs';

const bundle = JSON.parse(await readFile(new URL('../spec/examples/synthetic/bundle.json', import.meta.url), 'utf8'));
const encoder = new TextEncoder(), decoder = new TextDecoder();
const baseSources = new Map(bundle.snapshot.inventory.items.map(item => {
  const archive = JSON.parse(Buffer.from(bundle.archives[item.uri], 'base64').toString('utf8'));
  return [item.sourcePath, Uint8Array.from(Buffer.from(archive.contentBase64, 'base64'))];
}));
const registryPath = 'public/context-pack-registry.json';
const pathOf = url => 'public' + new URL(url).pathname;
const firstPack = JSON.parse(decoder.decode(baseSources.get(registryPath))).packs[0];
const payloadPath = pathOf(firstPack.payloadUrl);

async function rebuild(editPayload, editGraph = graph => graph, expectedGraph = []) {
  const sources = new Map(baseSources);
  const inventory = structuredClone(bundle.snapshot.inventory);
  const registry = JSON.parse(decoder.decode(sources.get(registryPath)));
  for (const [position, pack] of registry.packs.entries()) {
    const payloadFile = pathOf(pack.payloadUrl), manifestFile = pathOf(pack.manifestUrl);
    if (payloadFile === payloadPath) {
      const payload = JSON.parse(decoder.decode(sources.get(payloadFile)));
      editPayload(payload);
      sources.set(payloadFile, encoder.encode(JSON.stringify(payload) + '\n'));
    }
    const payloadRaw = sources.get(payloadFile);
    pack.payloadFileDigest = await digest(payloadRaw);
    pack.payloadDigest = await digest(canonical(strictParse(payloadRaw), {historical: true, nfc: true}));
    const manifest = JSON.parse(decoder.decode(sources.get(manifestFile)));
    Object.assign(manifest, {payloadDigest: pack.payloadDigest, payloadFileDigest: pack.payloadFileDigest});
    const manifestRaw = encoder.encode(JSON.stringify(manifest) + '\n');
    sources.set(manifestFile, manifestRaw);
    pack.manifestFileDigest = await digest(manifestRaw);
    pack.manifestDigest = await digest(canonical(manifest, {historical: true, nfc: true}));
    Object.assign(inventory.packs[position], pack);
  }
  sources.set(registryPath, encoder.encode(JSON.stringify(registry) + '\n'));
  const archives = new Map();
  for (const item of inventory.items) {
    const data = sources.get(item.sourcePath), repositoryDigest = await digest(data);
    const encoded = canonical({contentBase64: Buffer.from(data).toString('base64'), digest: repositoryDigest, digestAlgorithm: 'sha-256',
      digestScope: 'repository-bytes', encoding: 'base64', schemaVersion: '0.1.0-proposed', sourcePath: item.sourcePath, type: 'RuntimeSourceArchive'});
    const envelope = await digest(encoded);
    Object.assign(item, {repositoryDigest, version: repositoryDigest, byteLength: data.length, digest: envelope, uri: '/v0/artifacts/' + envelope.slice(8)});
    archives.set(item.uri, encoded);
  }
  inventory.graph = editGraph(expectedGraph);
  const root = await digest(canonical(inventory));
  const snapshot = {...bundle.snapshot, inventory, corpusRootDigest: root, snapshotId: 'governed-context-runtime:' + root};
  const checks = [];
  const result = verifySnapshot(snapshot, async uri => { if (!archives.has(uri)) throw new Error('archive not captured'); return archives.get(uri); }, bundle.expectedIntents, checks);
  return {result, checks};
}

const node = (field, semanticId, index, extra = {}) => ({
  id: firstPack.packId + '/' + field + '/' + semanticId, semanticId, kind: field, sourcePath: payloadPath,
  selector: `$.${field}[${index}]`, dependencies: [], ...extra,
});
const populated = payload => {
  payload.causalContexts = [{id: 'cc-a'}];
  payload.applicabilityChains = [{id: 'ac-a', linkedCausalContextId: 'cc-a'}];
  payload.weightingRules = [{ruleId: 'w-a', sourceArtifact: '/fictional-policy.json'}];
  payload.answerBoundaries = [{id: 'ab-a'}];
};
const expectedNodes = [
  node('causalContexts', 'cc-a', 0),
  node('applicabilityChains', 'ac-a', 0, {dependencies: [firstPack.packId + '/causalContexts/cc-a']}),
  node('weightingRules', 'w-a', 0, {ruleSourcePath: 'public/fictional-policy.json'}),
  node('answerBoundaries', 'ab-a', 0),
];
const refuses = async (promise, code) => assert.rejects(promise, error => error.name === 'VerificationError' && error.message === code, code);

test('the rebuild reproduces a valid snapshot when nothing is edited (empty graph baseline)', async () => {
  const {result, checks} = await rebuild(() => {});
  await result;
  assert.equal(checks.find(check => check.id === 'graph-coverage').status, 'PASS');
});

test('a populated graph is built with the hand-written nodes and dependencies', async () => {
  const {result, checks} = await rebuild(populated, graph => graph, expectedNodes);
  await result;
  const coverage = checks.find(check => check.id === 'graph-coverage');
  assert.equal(coverage.status, 'PASS');
  assert.equal(coverage.actual.length, 4);
});

test('a graph inventory that omits a node is refused under a recomputed root', async () => {
  const {result} = await rebuild(populated, graph => graph.slice(0, 3), expectedNodes);
  await refuses(result, 'graph-coverage');
});

test('a duplicate or missing semantic identifier is refused', async () => {
  await refuses((await rebuild(payload => { populated(payload); payload.causalContexts.push({id: 'cc-a'}); }, g => g, expectedNodes)).result, 'duplicate_graph_id');
  await refuses((await rebuild(payload => { populated(payload); payload.answerBoundaries = [{}]; }, g => g, expectedNodes)).result, 'duplicate_graph_id');
});

test('a dependency on an absent causal context is refused', async () => {
  const dangling = expectedNodes.map(n => n.kind === 'applicabilityChains' ? {...n, dependencies: [firstPack.packId + '/causalContexts/cc-missing']} : n);
  const {result} = await rebuild(payload => { populated(payload); payload.applicabilityChains[0].linkedCausalContextId = 'cc-missing'; }, g => g, dangling);
  await refuses(result, 'missing_graph_dependency');
});

test('a rule source outside the captured archives is refused, without any network access', async () => {
  const {result} = await rebuild(payload => { populated(payload); payload.weightingRules[0].sourceArtifact = '/not-captured.json'; }, g => g, expectedNodes);
  await refuses(result, 'source_missing');
});

test('isolated nodes are permitted: a causal context needs no chain pointing to it', async () => {
  const {result, checks} = await rebuild(payload => { payload.causalContexts = [{id: 'cc-a'}]; }, g => g, [node('causalContexts', 'cc-a', 0)]);
  await result;
  assert.equal(checks.find(check => check.id === 'graph-coverage').status, 'PASS');
});

test('an inventory that declares another relation or another traversal order is refused', async () => {
  const otherRelation = expectedNodes.map(n => n.kind === 'applicabilityChains' ? {...n, dependencies: []} : n);
  await refuses((await rebuild(populated, g => g, otherRelation)).result, 'graph-coverage');
  await refuses((await rebuild(populated, g => [...g].reverse(), expectedNodes)).result, 'graph-coverage');
});

test('v0 dependencies are one level deep, so no cycle can be expressed', async () => {
  // A link carried by a causal context creates no dependency.
  const {result, checks} = await rebuild(payload => { populated(payload); payload.causalContexts[0].linkedCausalContextId = 'cc-a'; }, g => g, expectedNodes);
  await result;
  assert.deepEqual(checks.find(check => check.id === 'graph-coverage').actual[0].dependencies, []);
  // A chain that names another chain resolves to an absent causal context and is refused.
  const toChain = expectedNodes.map(n => n.kind === 'applicabilityChains' ? {...n, dependencies: [firstPack.packId + '/causalContexts/ac-a']} : n);
  const looped = await rebuild(payload => { populated(payload); payload.applicabilityChains[0].linkedCausalContextId = 'ac-a'; }, g => g, toChain);
  await refuses(looped.result, 'missing_graph_dependency');
});
