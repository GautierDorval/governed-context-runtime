// SPDX-License-Identifier: Apache-2.0
// Separate local AJV instance; does not extend or mutate the historical four-schema catalogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Ajv2020} from 'ajv/dist/2020.js';

const NAMES = [
  'context-pack.schema.json',
  'context-pack-manifest.schema.json',
  'intent-registry.schema.json',
  'runtime-snapshot.schema.json',
];
const BASE = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
const ajv = new Ajv2020({strict: true, strictRequired: false, allErrors: true, validateFormats: false});
/** @type {Record<string, import('ajv').ValidateFunction>} */
const validators = {};
for (const name of NAMES) {
  const schema = JSON.parse(await readFile(new URL('../spec/' + name, import.meta.url), 'utf8'));
  ajv.addSchema(schema);
  const validate = ajv.getSchema(schema.$id);
  assert(validate);
  validators[name] = validate;
}
/** @param {string} name */
const readJson = async name => JSON.parse(await readFile(new URL(name, BASE), 'utf8'));
/** @param {string} schema @param {unknown} value */
const accepts = (schema, value) =>
  assert.equal(validators[schema](value), true, JSON.stringify(validators[schema].errors));
/** @param {unknown} value @param {string} keyword */
const refuses = (value, keyword) => {
  const validate = validators['context-pack.schema.json'];
  assert.equal(validate(value), false);
  assert(
    validate.errors?.some(error => error.keyword === keyword),
    JSON.stringify(validate.errors),
  );
};

test('the complete fictional snapshot, both registries, both packs and both manifests satisfy all four historical schemas', async () => {
  const bundle = await readJson('bundle.json');
  accepts('runtime-snapshot.schema.json', bundle.snapshot);
  for (const lang of ['fr', 'en']) {
    accepts('context-pack.schema.json', await readJson(lang + '.pack.json'));
    accepts('context-pack-manifest.schema.json', await readJson(lang + '.manifest.json'));
  }
  for (const path of ['public/intent-registry.json', 'data/runtime/intent-registry.source.json']) {
    const item = bundle.snapshot.inventory.items.find(
      (/** @type {{sourcePath: string}} */ entry) => entry.sourcePath === path,
    );
    assert(item);
    const archive = JSON.parse(Buffer.from(bundle.archives[item.uri], 'base64').toString('utf8'));
    accepts('intent-registry.schema.json', JSON.parse(Buffer.from(archive.contentBase64, 'base64').toString('utf8')));
  }
});

for (const lang of ['fr', 'en']) {
  for (const [field, required] of /** @type {[string, string[]][]} */ ([
    [
      'causalContexts',
      ['id', 'surface_topic', 'trigger', 'risk', 'latent_need', 'intended_consequence', 'forbidden_derivations'],
    ],
    [
      'applicabilityChains',
      [
        'id',
        'linkedCausalContextId',
        'applicableCapability',
        'triggerSituation',
        'latentNeed',
        'activationConditions',
        'nonApplicabilityConditions',
        'requiredEvidence',
        'forbiddenInferences',
        'applicabilityAbuseBoundaries',
        'riskClass',
        'domain',
        'status',
      ],
    ],
    ['weightingRules', ['ruleId', 'sourceArtifact', 'rule']],
    ['answerBoundaries', ['ruleId', 'sourceArtifact', 'rule']],
  ])) {
    test('incomplete ' + field + ' objects are refused: ' + lang, async () => {
      const pack = await readJson(lang + '.pack.json');
      assert.equal(typeof field, 'string');
      for (const key of required) {
        const variant = structuredClone(pack);
        delete variant[field][0][key];
        refuses(variant, 'required');
      }
      const onlyId = structuredClone(pack);
      onlyId[field][0] = {id: 'not-a-complete-object'};
      refuses(onlyId, 'required');
    });
  }
}

test('pedagogical answers and observations cannot be inserted into the closed pack', async () => {
  const pack = await readJson('fr.pack.json');
  refuses({...pack, illustrativeAnswer: 'authored, not observed'}, 'additionalProperties');
  refuses({...pack, modelScore: 1}, 'additionalProperties');
});

test('the semantic example schema catalogue never fetches a remote reference', () => {
  assert.throws(
    () => ajv.compile({$ref: 'https://example.invalid/missing.schema.json'}),
    error => error instanceof Error && error.constructor.name === 'MissingRefError',
  );
});
