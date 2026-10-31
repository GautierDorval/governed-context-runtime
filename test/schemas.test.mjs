// SPDX-License-Identifier: Apache-2.0
// Executes the four published JSON Schemas (draft 2020-12) against the objects they describe.
// Requires the locked development dependencies (npm ci --ignore-scripts). The catalogue is closed:
// only the four local files are registered and no loader is configured, so a reference to any
// other identifier fails at compilation instead of being fetched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Ajv2020} from 'ajv/dist/2020.js';
import {inventory, json, pathOf, registryPath, seal, setJson, sources, verify, bundle} from './synthetic.mjs';
/** @import {Check, ContextPack, ContextPackManifest, PackEntry, Snapshot, Unit} from './synthetic-types.d.mts' */

const FILES = [
  'context-pack.schema.json',
  'context-pack-manifest.schema.json',
  'intent-registry.schema.json',
  'runtime-snapshot.schema.json',
];
const BASE = 'https://gautierdorval.com/spec/governed-context-runtime/';
/** @type {{$id: string, $schema: string}[]} */
const schemas = await Promise.all(
  FILES.map(async file => JSON.parse(await readFile(new URL('../spec/' + file, import.meta.url), 'utf8'))),
);

// Draft 2020-12 treats "format" as an annotation unless the format-assertion vocabulary is used;
// these schemas use the default meta-schema, so formats are not asserted here either.
// strictRequired is a lint, not a 2020-12 rule: the historical snapshot schema deliberately lists
// required members of open pack, unit and graph objects without describing them (see docs/schemas.md).
const catalogue = () => {
  const ajv = new Ajv2020({strict: true, strictRequired: false, allErrors: true, validateFormats: false});
  for (const schema of schemas) ajv.addSchema(schema);
  return ajv;
};
const ajv = catalogue();
/** @param {string} file */
const validator = file => ajv.getSchema(BASE + file);
/** @param {string} file @param {unknown} value */
const valid = (file, value) => {
  const validate = validator(file);
  assert(validate, 'schema registered: ' + file);
  const ok = validate(value);
  return {ok, errors: (validate.errors ?? []).map(error => error.instancePath + ' ' + error.keyword)};
};
/** @param {string} file @param {unknown} value */
const accepts = (file, value) => {
  const {ok, errors} = valid(file, value);
  assert.equal(ok, true, file + ': ' + errors.join(', '));
};
/** @param {string} file @param {unknown} value @param {string} keyword */
const rejects = (file, value, keyword) => {
  const {ok, errors} = valid(file, value);
  assert.equal(ok, false, file + ' accepted an invalid object');
  assert(
    errors.some(error => error.endsWith(' ' + keyword)),
    file + ': expected ' + keyword + ', got ' + errors.join(', '),
  );
};

const base = sources();
/** @type {{packs: PackEntry[]}} */
const registry = json(base, registryPath);
/** @type {ContextPack[]} */
const payloads = registry.packs.map(pack => json(base, pathOf(pack.payloadUrl)));
/** @type {ContextPackManifest[]} */
const manifests = registry.packs.map(pack => json(base, pathOf(pack.manifestUrl)));

test('the catalogue holds exactly the four local schemas, each declaring draft 2020-12 and its documented identifier', () => {
  assert.deepEqual(
    schemas.map(schema => schema.$id),
    FILES.map(file => BASE + file),
  );
  for (const schema of schemas) assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  for (const file of FILES) assert.equal(typeof validator(file), 'function', file);
  // Only internal references are used.
  for (const schema of schemas)
    for (const ref of JSON.stringify(schema).match(/"\$ref":"[^"]*"/g) ?? [])
      assert.match(ref, /^"\$ref":"#\/\$defs\/[A-Za-z]+"$/);
});

test('a reference outside the catalogue fails at compilation and is never fetched', () => {
  const local = catalogue();
  for (const ref of [
    'https://example.invalid/remote.schema.json',
    BASE + 'unknown.schema.json',
    'http://127.0.0.1:1/schema.json',
  ]) {
    assert.throws(
      () => local.compile({$schema: 'https://json-schema.org/draft/2020-12/schema', $ref: ref}),
      error => error instanceof Error && error.constructor.name === 'MissingRefError',
      ref,
    );
  }
});

test('the synthetic objects conform to their schemas', () => {
  accepts('runtime-snapshot.schema.json', bundle.snapshot);
  for (const payload of payloads) accepts('context-pack.schema.json', payload);
  for (const manifest of manifests) accepts('context-pack-manifest.schema.json', manifest);
  accepts('intent-registry.schema.json', json(base, 'public/intent-registry.json'));
  accepts('intent-registry.schema.json', json(base, 'data/runtime/intent-registry.source.json'));
});

test('structural violations are refused by each schema', () => {
  const snapshot = structuredClone(bundle.snapshot);
  rejects('runtime-snapshot.schema.json', {...snapshot, extra: true}, 'additionalProperties');
  rejects('runtime-snapshot.schema.json', {...snapshot, corpusRootDigest: 'sha-256:' + 'A'.repeat(64)}, 'pattern');
  rejects('runtime-snapshot.schema.json', {...snapshot, inventory: {...snapshot.inventory, items: []}}, 'minItems');
  const item = snapshot.inventory.items[0];
  rejects(
    'runtime-snapshot.schema.json',
    {...snapshot, inventory: {...snapshot.inventory, items: [{...item, digestAlgorithm: 'sha-512'}]}},
    'const',
  );
  rejects(
    'runtime-snapshot.schema.json',
    {
      ...snapshot,
      inventory: {
        ...snapshot.inventory,
        authorityTransport: {...snapshot.inventory.authorityTransport, grantsGlobalRank: true},
      },
    },
    'const',
  );

  const {includedUnits, ...withoutUnits} = payloads[0];
  rejects('context-pack.schema.json', withoutUnits, 'required');
  rejects('context-pack.schema.json', {...payloads[0], type: 'GovernedContextPackManifest'}, 'const');
  rejects(
    'context-pack.schema.json',
    {...payloads[0], includedUnits: [{...includedUnits[0], canonicalText: 'not part of a pack reference'}]},
    'additionalProperties',
  );

  rejects('context-pack-manifest.schema.json', {...manifests[0], payloadDigest: 'sha256:' + '0'.repeat(64)}, 'pattern');
  const {generatedBy, ...withoutGenerator} = manifests[0];
  rejects('context-pack-manifest.schema.json', withoutGenerator, 'required');

  /** @type {Record<string, unknown>} */
  const intents = json(base, 'public/intent-registry.json');
  rejects('intent-registry.schema.json', {...intents, type: 'IntentRegistry'}, 'const');
  rejects('intent-registry.schema.json', {...intents, unexpected: []}, 'additionalProperties');
});

test('format is an annotation under the default 2020-12 vocabulary, not an assertion', () => {
  const {includedUnits} = payloads[0];
  accepts('context-pack.schema.json', {
    ...payloads[0],
    includedUnits: [{...includedUnits[0], canonicalSource: 'not a URI'}],
  });
});

// Profile requirements stricter than the historical schemas: a schema-valid object can still be
// refused by the verifier. Each case is sealed under a recomputed root, so the refusal comes from
// the profile rule and not from a digest mismatch.
/** @param {(unit: Unit) => void} edit */
async function unitVariant(edit) {
  const sourceMap = sources(),
    inv = inventory();
  /** @type {{units: Unit[]}} */
  const units = json(sourceMap, 'public/attested-interpretive-units.json');
  edit(units.units[0]);
  setJson(sourceMap, 'public/attested-interpretive-units.json', units);
  inv.units = units.units;
  const sealed = await seal(sourceMap, inv);
  return {snapshot: sealed.snapshot, ...verify(sealed)};
}
/** @param {{snapshot: Snapshot, result: Promise<unknown>, checks: Check[]}} variant @param {string} code */
const refusedBy = async (variant, code) => {
  const refusal = assert.rejects(
    variant.result,
    error => error instanceof Error && error.name === 'VerificationError' && error.message === code,
    code,
  );
  accepts('runtime-snapshot.schema.json', variant.snapshot);
  await refusal;
};

test('the sealing helper alone does not cause a refusal', async () => {
  const variant = await unitVariant(() => {});
  accepts('runtime-snapshot.schema.json', variant.snapshot);
  await assert.doesNotReject(variant.result);
});

test('a schema-valid unit without digestAlgorithm is refused by the verifier profile', async () => {
  await refusedBy(
    await unitVariant(unit => {
      delete unit.digestAlgorithm;
    }),
    'unit-algorithm',
  );
});

test('a schema-valid unit without selectedValueType, or with a wrong one, is refused by the verifier profile', async () => {
  await refusedBy(
    await unitVariant(unit => {
      delete unit.selectedValueType;
    }),
    'unit-selected-type',
  );
  await refusedBy(
    await unitVariant(unit => {
      unit.selectedValueType = 'str';
    }),
    'unit-selected-type',
  );
});

test('an envelope-scope unit without claimClass or canonicalText is refused by the verifier profile', async () => {
  await refusedBy(
    await unitVariant(unit => {
      delete unit.claimClass;
    }),
    'unit_recipe_mismatch',
  );
  await refusedBy(
    await unitVariant(unit => {
      delete unit.canonicalText;
    }),
    'unit_recipe_mismatch',
  );
});

// Declaration contracts have separate identities and never join the four-schema catalogue.
test('versioned declaration contracts compile as closed draft 2020-12 schemas offline', async () => {
  // Historical observability uses const with format but no type. strictTypes is an Ajv lint, not a JSON Schema assertion.
  const declarations = new Ajv2020({
    strict: true,
    strictTypes: false,
    strictRequired: false,
    allErrors: true,
    validateFormats: false,
  });
  for (const version of ['0.3.0', '0.4.0']) {
    const schema = JSON.parse(
      await readFile(new URL('../spec/declaration/' + version + '.schema.json', import.meta.url), 'utf8'),
    );
    assert.equal(schema.properties.schemaVersion.const, version);
    assert.equal(schema.additionalProperties, false);
    declarations.addSchema(schema);
    assert.equal(typeof declarations.getSchema(schema.$id), 'function');
  }
});
