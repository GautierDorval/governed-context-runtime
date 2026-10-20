// SPDX-License-Identifier: Apache-2.0
// This fixed teaching fixture is the only supported input. Not a corpus compiler.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {artifactPreimage, canonical, digest, unitPreimage, verifySnapshot} from '../../reference/verification.mjs';

const LANGUAGES = ['en', 'fr'];
const BOUNDARIES = ['activationConditions', 'nonApplicabilityConditions', 'requiredEvidence', 'forbiddenInferences', 'applicabilityAbuseBoundaries'];
const SOURCE = 'public/semantic-boundaries/content.json';
const COMPOSITION = 'data/runtime/context-pack-composition-policy.json';
const RECIPES = 'spec/governed-context-runtime/attestation-recipes.json';
const ORIGIN = 'https://gautierdorval.com'; // Inert locator required by the historical verifier profile.
const encoder = new TextEncoder();
/** @param {unknown} value */
const jsonBytes = value => encoder.encode(JSON.stringify(value, null, 2) + '\n');
/** @param {string} path */
const locator = path => ORIGIN + path.replace(/^public/, '');
/** @param {unknown} value @param {string} [pointer] @returns {{pointer: string, value: unknown}[]} */
export function terminalValues(value, pointer = '') {
  if (value === null || typeof value !== 'object') return [{pointer, value}];
  const entries = Object.entries(value);
  if (entries.length === 0) return [{pointer, value}];
  return entries.flatMap(([key, child]) => terminalValues(child, pointer + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1')));
}

/** Build bytes in memory; no network, writes, clock, randomness, signatures or user input. */
export async function buildFixture() {
  const inputBytes = await readFile(new URL('./content.json', import.meta.url));
  const content = JSON.parse(inputBytes.toString('utf8'));
  assert.equal(content.identity, 'boreal-quebec-technical-service-example-v1');
  assert.equal(content.version, 'semantic-boundaries-1');
  assert.equal(content.fictional, true);
  assert.deepEqual(Object.keys(content.locales).sort(), LANGUAGES);
  const version = content.version;
  const compositionPolicyId = 'fictional-boreal-local-explanation-v1';
  /** @type {Map<string, Uint8Array>} */
  const sources = new Map([[SOURCE, inputBytes], [RECIPES, await readFile(new URL('../../attestation-recipes.json', import.meta.url))]]);
  sources.set(COMPOSITION, jsonBytes({
    compositionPolicyId,
    fictional: true,
    purpose: 'Explain this fixed fictional service; never execute actions.',
    conditionConvention: 'The example requires every activation condition; missing or conflicting evidence stays undetermined. This is a teaching convention, not Runtime-wide normative logic.',
    sourcePath: SOURCE,
    sourceSelectors: LANGUAGES.map(lang => '$.locales.' + lang),
  }));
  const artifact = {
    path: SOURCE.replace(/^public/, ''), sourcePath: SOURCE,
    digest: await digest(artifactPreimage(SOURCE, inputBytes)), digestScope: 'complete_artifact',
  };
  /** @type {Record<string, any>[]} */
  const units = [];
  for (const lang of LANGUAGES) {
    for (const field of [...BOUNDARIES, 'weightingRules', 'answerBoundaries']) {
      const selector = '$.locales.' + lang + (BOUNDARIES.includes(field) ? '.applicabilityChains[0].' : '.') + field;
      const unit = {
        unitId: 'boreal-' + lang + '-' + field,
        sourcePath: SOURCE, selector,
        canonicalSource: locator(SOURCE),
        claimClass: 'fictional_service_boundary', authorityScope: 'fictional_teaching_example_only',
        digest: 'sha-256:' + '0'.repeat(64), digestAlgorithm: 'sha-256',
        digestScope: 'selected_unit_only', canonicalization: 'deterministic-json-sort-keys-v0', selectedValueType: 'list',
        allowedTransformations: ['Explain with the territory, conditions, uncertainty and fictional attribution intact.'],
        forbiddenTransformations: ['Infer execution permission, established eligibility or wider geographic availability.'],
      };
      unit.digest = await digest(unitPreimage(unit, inputBytes));
      units.push(unit);
    }
  }
  sources.set('public/attested-interpretive-units.json', jsonBytes({units}));
  sources.set('public/content-digests.json', jsonBytes({
    canonicalization: {json: 'deterministic-json-sort-keys-v0', text: 'utf8-nfc-lf-trimmed-v0'},
    artifacts: [{...artifact, digestAlgorithm: 'sha-256', canonicalization: 'deterministic-json-sort-keys-v0'}],
  }));
  /** @type {Record<string, any>[]} */
  const registryPacks = [];
  /** @type {Record<string, any>[]} */
  const indexedPacks = [];
  /** @type {Record<string, any>[]} */
  const graph = [];
  /** @type {Map<string, Uint8Array>} */
  const output = new Map();
  /** @type {Record<string, any>} */
  const comparison = {status: 'NOT_RUN', fictional: true, representation: 'complete-pack-versus-field-labelled-text', locales: {}};
  for (const lang of LANGUAGES) {
    const semantic = structuredClone(content.locales[lang]);
    assert.equal(semantic.applicabilityChains.length, 1, 'only the fixed teaching chain is supported');
    const packId = 'fictional-boreal-quebec-' + lang;
    const payloadSourcePath = 'public/semantic-boundaries/' + lang + '.json';
    const manifestSourcePath = 'public/semantic-boundaries/' + lang + '.manifest.json';
    const selectedUnits = units.filter(unit => unit.unitId.startsWith('boreal-' + lang + '-'));
    const payload = {
      schemaVersion: '0.2.0-proposed', type: 'GovernedContextPack', status: 'proposed',
      packId, intentToken: 'representation-gap', lang, version, compositionPolicyId, corpusVersion: version,
      ...semantic,
      // Each authored boundary lives once, in the chain; pack-level fields are generated projections.
      ...Object.fromEntries(BOUNDARIES.map(field => [field, structuredClone(semantic.applicabilityChains[0][field])])),
      includedUnits: selectedUnits.map(unit => Object.fromEntries(
        ['unitId', 'sourcePath', 'canonicalSource', 'claimClass', 'authorityScope', 'digest', 'digestScope', 'canonicalization'].map(key => [key, unit[key]]))),
      includedArtifacts: [artifact], manifestUrl: locator(manifestSourcePath),
    };
    const payloadRaw = jsonBytes(payload);
    const payloadIdentity = {
      payloadUrl: locator(payloadSourcePath), payloadDigest: await digest(canonical(payload, {historical: true, nfc: true})),
      payloadDigestScope: 'canonical-json', payloadFileDigest: await digest(payloadRaw), payloadFileDigestScope: 'repository-bytes',
    };
    const manifest = {
      schemaVersion: '0.2.0-proposed', type: 'GovernedContextPackManifest', status: 'proposed',
      packId, intentToken: 'representation-gap', lang, version, ...payloadIdentity,
      canonicalizationPolicyId: 'gd-deterministic-json-v1', fileEncoding: 'utf-8', fileLineEndings: 'lf',
      compositionPolicyId, corpusVersion: version, includedUnitIds: selectedUnits.map(unit => unit.unitId), includedArtifacts: [artifact.path],
      // The immutable historical schema requires this literal. It is a compatibility marker,
      // not evidence that the named Python script generated this fictional manifest.
      generatedBy: 'build_governed_context_packs.py',
    };
    const manifestRaw = jsonBytes(manifest);
    const entry = {
      packId, intentToken: 'representation-gap', lang, version, status: 'proposed', ...payloadIdentity,
      manifestUrl: locator(manifestSourcePath), manifestDigest: await digest(canonical(manifest, {historical: true, nfc: true})),
      manifestDigestScope: 'canonical-json', manifestFileDigest: await digest(manifestRaw), manifestFileDigestScope: 'repository-bytes',
      canonicalizationPolicyId: 'gd-deterministic-json-v1', fileEncoding: 'utf-8', fileLineEndings: 'lf',
    };
    registryPacks.push(entry);
    indexedPacks.push({...entry, payloadSourcePath, manifestSourcePath,
      dependencies: [COMPOSITION, RECIPES, 'public/attested-interpretive-units.json', SOURCE], unitIds: manifest.includedUnitIds});
    sources.set(payloadSourcePath, payloadRaw);
    sources.set(manifestSourcePath, manifestRaw);
    output.set(lang + '.pack.json', payloadRaw);
    output.set(lang + '.manifest.json', manifestRaw);
    for (const field of ['causalContexts', 'applicabilityChains', 'weightingRules', 'answerBoundaries']) {
      for (const [i, item] of payload[field].entries()) {
        const semanticId = item.id ?? item.ruleId;
        const node = {id: packId + '/' + field + '/' + semanticId, semanticId, kind: field,
          sourcePath: payloadSourcePath, selector: '$.' + field + '[' + i + ']',
          dependencies: field === 'applicabilityChains' ? [packId + '/causalContexts/' + item.linkedCausalContextId] : [],
          ...(item.sourceArtifact === undefined ? {} : {ruleSourcePath: 'public' + item.sourceArtifact}),
        };
        graph.push(node);
      }
    }
    // The conservative text baseline represents every terminal value, including all metadata.
    // JSON Pointer labels retain the references and relation identity; each value is written once
    // per occurrence, in the same traversal order. This is no paraphraser or semantic evaluator.
    const rows = terminalValues(payload).map(({pointer, value}, i) => ({
      id: 'value-' + String(i + 1).padStart(3, '0'), packPointer: pointer, textLine: 2 * i + 1, value,
    }));
    const text = rows.map(row => lang === 'fr'
      ? '[' + row.id + '] La propriété ' + JSON.stringify(row.packPointer) + ' déclare la valeur ' + JSON.stringify(row.value) + '.'
      : '[' + row.id + '] Property ' + JSON.stringify(row.packPointer) + ' declares the value ' + JSON.stringify(row.value) + '.').join('\n\n') + '\n';
    const textRaw = encoder.encode(text);
    output.set(lang + '.canonical-text.md', textRaw);
    comparison.locales[lang] = {
      packFile: lang + '.pack.json', textFile: lang + '.canonical-text.md',
      packBytes: payloadRaw.length, textBytes: textRaw.length,
      packUnicodeScalars: [...new TextDecoder().decode(payloadRaw)].length, textUnicodeScalars: [...text].length,
      packDigest: await digest(payloadRaw), textDigest: await digest(textRaw),
      tokenizerMeasurement: 'NOT_RUN: record model-specific token counts before any authorized experiment', rows,
    };
  }
  const intent = {
    intentToken: 'representation-gap', intentClass: 'applicability', status: 'proposed', version,
    displayNameFr: 'Limites du service fictif Atelier Boréal', displayNameEn: 'Fictional Boreal Workshop service boundaries',
    descriptionFr: 'Exercice local de disponibilité conditionnelle au Québec.', descriptionEn: 'Local exercise in conditional availability in Quebec.',
    linkedCausalContextIds: ['quebec-conditional-service'], linkedApplicabilityChainIds: ['project-assessment-chain'],
    triggerSituationsFr: ['Demande d’explication des conditions du service fictif.'], triggerSituationsEn: ['Request to explain the fictional service conditions.'],
    nonApplicabilitySummaryFr: 'Aucune offre réelle et aucune permission d’action.', nonApplicabilitySummaryEn: 'No real offer and no permission to act.',
    packIds: Object.fromEntries(registryPacks.map(pack => [pack.lang, pack.packId])),
    canonicalUrls: Object.fromEntries(registryPacks.map(pack => [pack.lang, pack.payloadUrl])),
    attestationUnitId: 'boreal-fr-activationConditions', deprecatedAliases: [],
  };
  const intentRegistry = {
    schemaVersion: '0.1.0-proposed', type: 'CanonicalIntentRegistry', status: 'proposed', site: ORIGIN + '/',
    runtimeBoundary: {agentSelectsIntent: true, runtimeSelectsIntentFromFreeText: false, runtimeComposesAtRequestTime: false, runtimeProducesAnswers: false},
    intents: [intent],
  };
  sources.set('public/intent-registry.json', jsonBytes(intentRegistry));
  sources.set('data/runtime/intent-registry.source.json', jsonBytes(intentRegistry));
  sources.set('public/context-pack-registry.json', jsonBytes({corpusVersion: version, packs: registryPacks}));
  /** @type {Record<string, string>} */
  const archives = {};
  const items = [];
  for (const [sourcePath, raw] of [...sources.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const repositoryDigest = await digest(raw);
    const encoded = canonical({type: 'RuntimeSourceArchive', schemaVersion: '0.1.0-proposed', sourcePath,
      digest: repositoryDigest, digestAlgorithm: 'sha-256', digestScope: 'repository-bytes', encoding: 'base64', contentBase64: Buffer.from(raw).toString('base64')});
    const envelopeDigest = await digest(encoded);
    const uri = '/v0/artifacts/' + envelopeDigest.slice(8);
    archives[uri] = Buffer.from(encoded).toString('base64');
    items.push({sourcePath, uri, kind: 'source-archive', version: repositoryDigest, digestScope: 'canonical-json',
      canonicalization: 'gd-portable-json-v1', digestAlgorithm: 'sha-256', digest: envelopeDigest, repositoryDigest, byteLength: raw.length});
  }
  const inventory = {
    profile: 'gd-portable-json-v1', schemaVersion: '0.1.0-proposed', type: 'GovernedContextCorpusInventory', corpusVersion: version,
    items, packs: indexedPacks, units, graph, authoritySources: [SOURCE],
    authorityTransport: {status: 'proposed-not-ratified', grantsGlobalRank: false, rule: 'Fictional local documentary priorities; integrity establishes neither truth nor action permission.'},
    externalReferences: {policy: 'All locators are inert. Only indexed sourcePath archives are resolved locally; example.invalid capability URLs are not retrieved or verified.'},
    digestRegistryCoverage: {registry: [SOURCE], packOnly: []},
  };
  const expectedRoot = await digest(canonical(inventory));
  const snapshot = {schemaVersion: '0.1.0-proposed', type: 'GovernedContextCorpusSnapshot', snapshotId: 'governed-context-runtime:' + expectedRoot, corpusRootDigest: expectedRoot, inventory};
  await verifySnapshot(snapshot, uri => Buffer.from(archives[uri], 'base64'), [intent]);
  output.set('bundle.json', jsonBytes({fictional: true, identity: content.identity, actualGenerator: 'spec/examples/semantic-boundaries/generate.mjs',
    provenance: 'Deterministic local teaching fixture; no signed receipt, real service or observed model use.', expectedIntents: [intent], snapshot, archives}));
  output.set('expected-root.json', jsonBytes({fictional: true, expectedRoot,
    trustScope: 'Pedagogical anchor delivered separately from bundle.json; not independent third-party trust.',
    signatureTrust: 'not-established', usePermission: 'not-evaluated'}));
  output.set('comparison-map.json', jsonBytes(comparison));
  return {output, sources, snapshot, intentRegistry};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const mode = process.argv[2];
  if (!['--write', '--check'].includes(mode) || process.argv.length !== 3) throw Error('usage: node spec/examples/semantic-boundaries/generate.mjs --write|--check');
  const {output} = await buildFixture();
  for (const [name, bytes] of output) {
    const path = new URL('./' + name, import.meta.url);
    if (mode === '--write') await writeFile(path, bytes);
    else assert.deepEqual(await readFile(path), Buffer.from(bytes), 'stale generated fixture: ' + name);
  }
  console.log(JSON.stringify({status: mode === '--write' ? 'GENERATED_FICTIONAL_FIXTURE' : 'FIXTURE_CURRENT', files: output.size, modelExperiment: 'NOT_RUN'}));
}
