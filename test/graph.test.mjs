// SPDX-License-Identifier: Apache-2.0
// Exercises graph construction in verifySnapshot, which the published example (empty graph) never
// reached. A fictional variant is rebuilt from the example: payload edited, then pack digests,
// manifests, registry, archives and root recomputed. Expected nodes are written out by hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import {inventory, json, pathOf, registryPath, resealPacks, seal, setJson, sources, verify} from './synthetic.mjs';

const firstPack = json(sources(), registryPath).packs[0];
const payloadPath = pathOf(firstPack.payloadUrl);

async function rebuild(editPayload, editGraph = graph => graph, expectedGraph = []) {
  const sourceMap = sources(), inv = inventory();
  const payload = json(sourceMap, payloadPath);
  editPayload(payload);
  setJson(sourceMap, payloadPath, payload);
  await resealPacks(sourceMap, inv);
  inv.graph = editGraph(expectedGraph);
  return verify(await seal(sourceMap, inv));
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
