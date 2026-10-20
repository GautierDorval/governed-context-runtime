// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Ajv2020} from 'ajv/dist/2020.js';
import {checkObservationSemantics, isObservationDate, parseObservationUtc} from '../spec/evidence/observations.mjs';

const files = ['runtime-public-observation-v1.schema.json', 'runtime-public-deployment-observation-v1.schema.json'];
const ids = [
  'urn:governed-context-runtime:evidence:runtime-public-observation:1',
  'urn:governed-context-runtime:evidence:runtime-public-deployment-observation:1',
];
const schemas = await Promise.all(
  files.map(async file => JSON.parse(await readFile(new URL('../spec/evidence/' + file, import.meta.url), 'utf8'))),
);
const catalogue = () => {
  const local = new Ajv2020({strict: true, allErrors: true, validateFormats: true});
  local.addFormat('observation-utc', {type: 'string', validate: value => parseObservationUtc(value) !== null});
  local.addFormat('observation-date', {type: 'string', validate: isObservationDate});
  for (const schema of schemas) local.addSchema(schema);
  return local;
};
const ajv = catalogue();
const historical = await Promise.all(
  ['12', '14', '19'].map(async day => {
    const bytes = await readFile(new URL('../evidence/instance-2026-10-' + day + '.json', import.meta.url));
    return {day, bytes, value: JSON.parse(bytes.toString('utf8'))};
  }),
);
/** @param {number} index */
const copy = index => structuredClone(historical[index].value);
/** @param {number} index @param {unknown} value */
const structurallyValid = (index, value) => {
  const validate = ajv.getSchema(ids[index === 0 ? 0 : 1]);
  assert(validate);
  return {ok: validate(value), errors: validate.errors};
};
/** @param {number} index @param {unknown} value @param {string} keyword */
const rejects = (index, value, keyword) => {
  const result = structurallyValid(index, value);
  assert.equal(result.ok, false);
  assert(
    result.errors?.some(error => error.keyword === keyword),
    JSON.stringify(result.errors),
  );
};
/** @param {unknown} value @param {string} code */
const inconsistent = (value, code) => {
  const result = checkObservationSemantics(value);
  assert.equal(result.consistency, 'INCONSISTENT');
  assert(
    result.diagnostics.some(item => item.code === code),
    JSON.stringify(result),
  );
};

test('the observation catalogue is separate, local and closed', () => {
  assert.deepEqual(
    schemas.map(schema => schema.$id),
    ids,
  );
  for (const schema of schemas) {
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    for (const match of JSON.stringify(schema).matchAll(/"\$ref":"([^"]+)"/g))
      assert.match(match[1], /^#\/\$defs\/[A-Za-z0-9]+$/);
  }
  const local = catalogue();
  for (const ref of ['urn:governed-context-runtime:evidence:unknown:1', 'https://example.invalid/schema.json']) {
    assert.throws(
      () => local.compile({$ref: ref}),
      error => error instanceof Error && error.constructor.name === 'MissingRefError',
    );
  }
});

test('all three historical byte sequences validate without rewriting their contents', () => {
  const hashes = [
    'b880ec16f776899ab7cf153574436b1ebcb3da09691dd1b2e36090921f17c920',
    'e16153d32eb2eced5b65b4d9a253e323c590d4dde568d69247d726f30c0b0293',
    '74503371f7e6a60bf93f0218da194a4000d2f6c514cb60e748e83763c5852ad1',
  ];
  for (let i = 0; i < historical.length; i++) {
    const {value, bytes} = historical[i];
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[i]);
    const before = JSON.stringify(value);
    const result = structurallyValid(i, value);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    const semantic = checkObservationSemantics(value);
    assert.equal(semantic.consistency, 'CONSISTENT', JSON.stringify(semantic));
    assert.equal(semantic.declaredStatus, 'PASS');
    assert.equal(semantic.rawResponsesPublished, false);
    assert.equal(semantic.responseBodiesRechecked, false);
    assert.equal(semantic.hostedObservationRepeated, false);
    assert.equal(JSON.stringify(value), before);
  }
});

test('each historical variant requires its own identity, method, scope and members', () => {
  for (const [index, key] of /** @type {[number, string][]} */ ([
    [0, 'observer'],
    [0, 'scope'],
    [0, 'closureReconciliation'],
    [1, 'followupReadback'],
    [1, 'capture'],
    [2, 'applicationProof'],
    [2, 'provenance'],
  ])) {
    const value = copy(index);
    delete value[key];
    rejects(index, value, 'required');
  }
  const value = copy(0);
  delete value.requests[0].method;
  rejects(0, value, 'required');
  for (const index of [0, 1, 2]) {
    const changed = copy(index);
    changed.observer = 'independent-auditor';
    rejects(index, changed, 'const');
  }
});

test('unknown schemas and mixed variants are rejected', () => {
  for (const index of [0, 1, 2]) {
    const value = copy(index);
    value.schema += '-unknown';
    rejects(index, value, 'const');
    inconsistent(value, 'unknown_schema');
  }
  const value = {...copy(1), applicationProof: copy(2).applicationProof};
  rejects(1, value, 'additionalProperties');
  inconsistent(value, 'unknown_variant');
});

test('malformed digests, negative or nonintegral counts and unavailable-body claims are rejected', () => {
  for (const index of [0, 1, 2]) {
    const value = copy(index);
    value.corpusRootDigest = 'sha-256:' + 'A'.repeat(64);
    rejects(index, value, 'pattern');
    value.corpusRootDigest = historical[index].value.corpusRootDigest;
    value.rawResponsesPublished = true;
    rejects(index, value, 'const');
  }
  const early = copy(0);
  early.requests[0].sha256 = '0'.repeat(63);
  rejects(0, early, 'pattern');
  const late = copy(2);
  for (const count of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    late.applicationProof.totalRequests = count;
    rejects(2, late, count < 0 ? 'minimum' : count === 1.5 ? 'type' : 'maximum');
  }
});

test('UTC profile checks calendar validity, leap years, offsets and fractional precision', () => {
  for (const value of [
    '2026-02-29T00:00:00Z',
    '1900-02-29T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-00-01T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '0000-01-01T00:00:00Z',
    '2026-10-19T24:00:00Z',
    '2026-10-19T00:60:00Z',
    '2026-10-19T00:00:60Z',
    '2026-10-19t00:00:00z',
    '2026-10-19T00:00:00-00:00',
    '2026-10-19T00:00:00+01:00',
    '2026-10-19T00:00:00.1234567890Z',
    '2026-10-19T00:00:00.Z',
    ' 2026-10-19T00:00:00Z',
  ])
    assert.equal(parseObservationUtc(value), null, value);
  for (const value of [
    '2000-02-29T00:00:00Z',
    '2024-02-29T00:00:00.1+00:00',
    '0001-01-01T00:00:00Z',
    '9999-12-31T23:59:59.999999999Z',
  ])
    assert.notEqual(parseObservationUtc(value), null, value);
  assert.equal(isObservationDate('2026-02-29'), false);
  assert.equal(isObservationDate('2000-02-29'), true);
  assert.equal(
    parseObservationUtc('2026-10-19T14:11:55.743047+00:00'),
    parseObservationUtc('2026-10-19T14:11:55.743047000Z'),
  );
});

test('AJV asserts the registered calendar format rather than merely annotating dates', () => {
  for (const index of [0, 1, 2]) {
    const value = copy(index);
    value.startedAt = '2026-02-29T01:00:00Z';
    rejects(index, value, 'format');
    inconsistent(value, 'invalid_date');
  }
  const value = copy(0);
  value.closureReconciliation.dateUtc = '2026-02-29';
  rejects(0, value, 'format');
});

test('impossible intervals and submillisecond reversals are rejected', () => {
  for (const index of [0, 1, 2]) {
    const value = copy(index);
    value.startedAt = '2026-10-20T00:00:00Z';
    inconsistent(value, 'reversed_interval');
  }
  const value = copy(2);
  value.applicationProof.startedAt = '2026-10-19T14:12:00.000000002Z';
  value.applicationProof.finishedAt = '2026-10-19T14:12:00.000000001Z';
  inconsistent(value, 'reversed_interval');
  value.runtimeSmoke.finishedAt = '2026-10-20T00:00:00Z';
  inconsistent(value, 'outside_main_interval');
});

test('request capture chronology belongs to the October 12 main interval only', () => {
  const value = copy(0);
  value.requests[1].capturedAt = value.requests[0].capturedAt.replace('45.977', '45.976');
  inconsistent(value, 'request_order');
  value.requests[1].capturedAt = '2026-10-13T00:00:00Z';
  inconsistent(value, 'outside_main_interval');
});

test('October 14 supplements have separate valid intervals after the main capture', () => {
  const value = copy(1);
  const supplementStart = parseObservationUtc(value.followupReadback.startedAt),
    mainEnd = parseObservationUtc(value.finishedAt);
  assert(supplementStart !== null && mainEnd !== null && supplementStart > mainEnd);
  assert.equal(checkObservationSemantics(value).consistency, 'CONSISTENT');
  value.followupReadback.lastPowerShellResponseAt = value.startedAt;
  inconsistent(value, 'reversed_interval');
  const misplaced = copy(1);
  misplaced.capture.followupReadback = misplaced.followupReadback;
  delete misplaced.followupReadback;
  rejects(1, misplaced, 'required');
});

test('only explicitly related populations are totalled; a missing value is not zero', () => {
  const early = copy(0);
  early.closureReconciliation.requests.totalAttempted = 8;
  inconsistent(early, 'count_total_mismatch');
  const late = copy(2);
  late.applicationProof.totalRequests = 576 + 156;
  inconsistent(late, 'count_total_mismatch');
  delete late.applicationProof.runtimeHealthRequests;
  inconsistent(late, 'invalid_count');
  rejects(2, late, 'required');
  const separate = copy(2);
  separate.runtimeSmoke.indexedResources = 300;
  assert.equal(checkObservationSemantics(separate).consistency, 'CONSISTENT');
  const middle = copy(1);
  middle.capture.distinctSnapshotRoots = middle.capture.snapshotEntriesVerified + 1;
  inconsistent(middle, 'distinct_roots_exceed_entries');
});

test('route/surface and discovery-tool counts have concrete units', () => {
  const value = copy(2);
  value.rootFiles.routes++;
  inconsistent(value, 'route_surface_count_mismatch');
  value.mcp.toolsListed++;
  inconsistent(value, 'tool_count_mismatch');
});

test('historical roots stay separate while current root disagreements fail', () => {
  const value = copy(2);
  assert.notEqual(value.mcp.checks['historical-pack'].corpusRoot, value.corpusRootDigest);
  assert.equal(checkObservationSemantics(value).consistency, 'CONSISTENT');
  value.mcp.checks['current-pack-fr'].corpusRoot = value.mcp.checks['historical-pack'].corpusRoot;
  inconsistent(value, 'current_root_mismatch');
});

test('declared PASS remains distinct from locally recalculated consistency', () => {
  const value = copy(0);
  value.requests[0].status = 503;
  assert.equal(structurallyValid(0, value).ok, true);
  inconsistent(value, 'declared_pass_contradiction');
  value.status = 'FAIL';
  const result = checkObservationSemantics(value);
  assert.equal(result.declaredStatus, 'FAIL');
  assert.equal(result.consistency, 'CONSISTENT');
  assert.equal(result.structuralValidationPerformed, false);
  const late = copy(2);
  late.runtimeSmoke.exitCode = 1;
  inconsistent(late, 'declared_pass_contradiction');
});
