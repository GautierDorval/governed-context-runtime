// SPDX-License-Identifier: Apache-2.0
// These tests check fixture equivalence and integrity, never a model's semantic compliance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonical, digest, strictParse, verifySnapshot} from '../spec/reference/verification.mjs';
import {inspectVerifiedPack} from '../spec/examples/verified-pack.mjs';
import {buildFixture} from '../spec/examples/semantic-boundaries/generate.mjs';
import {loadSemanticExample, runSemanticDemo} from '../spec/examples/semantic-boundaries/demo.mjs';
import {json, resealPacks, seal, setJson} from './synthetic.mjs';

const BASE = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
/** @param {string} name */
const readJson = async name => JSON.parse(await readFile(new URL(name, BASE), 'utf8'));
/** @param {any} bundle @param {string} expectedRoot @param {string} [lang] */
const inspect = (bundle, expectedRoot, lang = 'fr') =>
  inspectVerifiedPack({
    snapshotBytes: canonical(bundle.snapshot),
    expectedRoot,
    expectedIntents: bundle.expectedIntents,
    intentToken: 'representation-gap',
    lang,
    version: 'semantic-boundaries-1',
    /** @param {string} uri */
    getArchive: uri => {
      if (!Object.hasOwn(bundle.archives, uri)) throw Error('semantic_archive_missing');
      return Buffer.from(bundle.archives[uri], 'base64');
    },
  });

for (const lang of ['fr', 'en']) {
  test('complete teaching pack is selected and verified without a model: ' + lang, async () => {
    const result = await runSemanticDemo(lang);
    assert.equal(result.status, 'VERIFIED_FICTIONAL_SEMANTIC_CONTEXT');
    assert.equal(result.pack.lang, lang);
    assert.equal(result.pack.packId, 'fictional-boreal-quebec-' + lang);
    assert.equal(result.verification.signatureTrust, 'not-established');
    assert.equal(result.verification.usePermission, 'not-evaluated');
    assert.equal(result.modelExperiment, 'NOT_RUN');
    assert.equal(result.modelUseObserved, false);
    assert.equal(result.units.length, 7);
    assert.equal(result.pack.causalContexts.length, 1);
    assert.equal(result.pack.applicabilityChains.length, 1);
    assert.equal(result.pack.weightingRules.length, 1);
    assert.equal(result.pack.answerBoundaries.length, 2);
    for (const field of [
      'activationConditions',
      'nonApplicabilityConditions',
      'requiredEvidence',
      'forbiddenInferences',
      'applicabilityAbuseBoundaries',
    ]) {
      assert.deepEqual(
        result.pack[field],
        result.pack.applicabilityChains[0][field],
        'generated aggregate preserves chain semantics',
      );
      assert(result.pack[field].length >= 2, 'substantive boundaries, not identifiers alone');
    }
    assert(result.pack.activationConditions[0].includes(lang === 'fr' ? 'Québec' : 'Quebec'));
    assert(
      result.pack.activationConditions[1].includes(lang === 'fr' ? 'évaluation technique' : 'technical assessment'),
    );
    for (const item of result.units) {
      assert.equal(item.unit.digestScope, 'selected_unit_only');
      assert.deepEqual(item.legacyDigest.recordFieldsCovered, []);
      assert(Array.isArray(item.selectedValue));
    }
  });
}

test('every generated artifact matches the deterministic in-memory build, without rewriting files', async () => {
  const {output} = await buildFixture();
  assert.equal(output.size, 9);
  for (const [name, bytes] of output) assert.deepEqual(await readFile(new URL(name, BASE)), Buffer.from(bytes), name);
});

test('fictional identity and anchor are separate from the old signed example', async () => {
  const {bundle, anchor} = await loadSemanticExample();
  const historical = JSON.parse(
    await readFile(new URL('../spec/examples/synthetic/bundle.json', import.meta.url), 'utf8'),
  );
  assert.match(historical.policy.expectedRoot, /^sha-256:[a-f0-9]{64}$/);
  assert.equal(historical.expectedRoot, historical.policy.expectedRoot);
  assert.equal(historical.snapshot.corpusRootDigest, historical.policy.expectedRoot);
  assert.notEqual(anchor.expectedRoot, historical.policy.expectedRoot);
  assert.equal(bundle.identity, 'boreal-quebec-technical-service-example-v1');
  assert.equal(Object.hasOwn(bundle, 'expectedRoot'), false, 'the demo must read the separate anchor');
  assert.equal(Object.hasOwn(bundle, 'receipt'), false, 'no new signature');
  assert.equal(anchor.fictional, true);
  assert.equal(bundle.actualGenerator, 'spec/examples/semantic-boundaries/generate.mjs');
});

test('a wrong separately supplied root refuses before any archive access', async () => {
  const {bundle} = await loadSemanticExample();
  let reads = 0;
  await assert.rejects(
    () =>
      inspectVerifiedPack({
        snapshotBytes: canonical(bundle.snapshot),
        expectedRoot: 'sha-256:' + '0'.repeat(64),
        intentToken: 'representation-gap',
        lang: 'fr',
        version: 'semantic-boundaries-1',
        getArchive: () => {
          reads++;
          throw Error('must not read');
        },
      }),
    {name: 'VerificationError', message: 'unexpected_corpus_root'},
  );
  assert.equal(reads, 0);
});

test('missing and altered archives refuse under the pedagogical anchor', async () => {
  const {bundle, anchor} = await loadSemanticExample();
  const uri = bundle.snapshot.inventory.items[0].uri;
  const missing = structuredClone(bundle);
  delete missing.archives[uri];
  await assert.rejects(() => inspect(missing, anchor.expectedRoot), {message: 'semantic_archive_missing'});
  const altered = structuredClone(bundle);
  const bytes = Buffer.from(altered.archives[uri], 'base64');
  bytes[bytes.length - 2] ^= 1;
  altered.archives[uri] = bytes.toString('base64');
  await assert.rejects(
    () => inspect(altered, anchor.expectedRoot),
    error => error instanceof Error && error.message.startsWith('archive-envelope:'),
  );
});

test('all graph nodes and local rule references resolve in the complete snapshot', async () => {
  const {bundle, anchor} = await loadSemanticExample();
  const result = await inspect(bundle, anchor.expectedRoot);
  assert.equal(bundle.snapshot.inventory.graph.length, 10);
  const nodeIds = new Set(bundle.snapshot.inventory.graph.map((/** @type {{id: string}} */ node) => node.id));
  for (const node of bundle.snapshot.inventory.graph) {
    for (const dependency of node.dependencies) assert(nodeIds.has(dependency));
    if (node.ruleSourcePath) assert.equal(node.ruleSourcePath, 'public/semantic-boundaries/content.json');
  }
  const source = result.sources.find(
    (/** @type {{sourcePath: string}} */ item) => item.sourcePath === 'public/semantic-boundaries/content.json',
  );
  assert(source);
  assert.deepEqual(Buffer.from(source.contentBase64, 'base64'), await readFile(new URL('content.json', BASE)));
  for (const rule of [...result.pack.weightingRules, ...result.pack.answerBoundaries])
    assert.equal(rule.sourceArtifact, '/semantic-boundaries/content.json');
});

test('a missing rule source refuses even under a deliberately recomputed test root', async () => {
  const built = await buildFixture();
  /** @type {import('./synthetic-types.d.mts').Inventory} */
  const inv = JSON.parse(JSON.stringify(built.snapshot.inventory));
  const path = 'public/semantic-boundaries/fr.json';
  /** @type {any} */
  const payload = json(built.sources, path);
  payload.weightingRules[0].sourceArtifact = '/not-captured.json';
  setJson(built.sources, path, payload);
  await resealPacks(built.sources, inv);
  const rebuilt = await seal(built.sources, inv);
  await assert.rejects(() => verifySnapshot(rebuilt.snapshot, rebuilt.getArchive), {
    name: 'VerificationError',
    message: 'source_missing',
  });
});

/** Independently enumerate terminal values, including empty arrays/objects, for complete coverage. */
/** @param {unknown} value @param {string} [path] @returns {Map<string, unknown>} */
function leaves(value, path = '') {
  const result = new Map();
  if (value !== null && typeof value === 'object' && Object.keys(value).length) {
    for (const [key, child] of Object.entries(value)) {
      for (const entry of leaves(child, path + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1')))
        result.set(...entry);
    }
  } else result.set(path, value);
  return result;
}

for (const lang of ['fr', 'en']) {
  test('text and pack have exactly equal facts, references, relations and metadata: ' + lang, async () => {
    const mapping = await readJson('comparison-map.json');
    const packRaw = await readFile(new URL(lang + '.pack.json', BASE));
    const textRaw = await readFile(new URL(lang + '.canonical-text.md', BASE));
    const pack = strictParse(packRaw),
      text = textRaw.toString('utf8');
    const mapped = mapping.locales[lang];
    const expected = leaves(pack);
    assert.equal(mapping.status, 'NOT_RUN');
    assert.equal(mapped.rows.length, expected.size);
    assert.equal(
      new Set(mapped.rows.map((/** @type {{packPointer: string}} */ row) => row.packPointer)).size,
      expected.size,
    );
    const paragraphs = text.trimEnd().split('\n\n');
    assert.equal(paragraphs.length, expected.size, 'no added textual fact or instruction');
    for (const [i, row] of mapped.rows.entries()) {
      assert(expected.has(row.packPointer), row.packPointer);
      assert.deepEqual(row.value, expected.get(row.packPointer), row.packPointer);
      assert.equal(row.textLine, 2 * i + 1);
      const lead = lang === 'fr' ? 'La propriété ' : 'Property ';
      const middle = lang === 'fr' ? ' déclare la valeur ' : ' declares the value ';
      assert.equal(
        paragraphs[i],
        '[' + row.id + '] ' + lead + JSON.stringify(row.packPointer) + middle + JSON.stringify(row.value) + '.',
      );
    }
    assert.equal(mapped.packBytes, packRaw.length);
    assert.equal(mapped.textBytes, textRaw.length);
    assert.equal(mapped.packUnicodeScalars, [...packRaw.toString('utf8')].length);
    assert.equal(mapped.textUnicodeScalars, [...text].length);
    assert.equal(mapped.packDigest, await digest(packRaw));
    assert.equal(mapped.textDigest, await digest(textRaw));
    assert(mapped.tokenizerMeasurement.startsWith('NOT_RUN'));
  });
}

test('the paired teaching cases contain prespecified questions and no invented observations or scores', async () => {
  const scenarios = await readJson('scenarios.json');
  assert.equal(scenarios.status, 'NOT_RUN');
  assert.deepEqual(scenarios.observedResponses, []);
  assert.equal(scenarios.scores, null);
  assert.equal(scenarios.cases.length, 7);
  const dimensions = new Set(scenarios.cases.flatMap((/** @type {{dimensions: string[]}} */ item) => item.dimensions));
  for (const dimension of [
    'condition-retention',
    'exclusion-retention',
    'unsupported-scope-extension',
    'explanation-permission-confusion',
    'unjustified-refusal',
    'reference-retention',
    'missing-information',
    'contradictory-information',
  ])
    assert(dimensions.has(dimension));
  for (const item of scenarios.cases) {
    for (const lang of ['fr', 'en']) {
      assert.equal(typeof item[lang].question, 'string');
      assert.equal(typeof item[lang].illustrativeAnswer, 'string');
      assert(item[lang].unacceptableClaims.length > 0);
    }
  }
});
