// SPDX-License-Identifier: Apache-2.0
// The mutation harness counts a mutant as detected only from a consistent run whose failing tests
// all report assertion errors. Synthetic TAP outputs cover the misclassifications found by the
// independent review of 2026-10-14, so that they stay refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import {verdict} from '../scripts/mutation-verdict.mjs';

/** @param {number} n */
const ok = n => [`ok ${n} - passing case`, '  ---', '  duration_ms: 1', "  type: 'test'", '  ...'].join('\n');
/** @param {number} n @param {string} name @param {string} code @param {string[]} [extra] */
const notOk = (n, name, code, extra = []) =>
  [
    `not ok ${n} - failing case`,
    '  ---',
    '  duration_ms: 1',
    "  type: 'test'",
    "  failureType: 'testCodeFailure'",
    "  error: 'ERR_ASSERTION fixture unavailable'",
    `  code: '${code}'`,
    `  name: '${name}'`,
    ...extra,
    '  ...',
  ].join('\n');
/** @param {string[]} blocks @param {{pass: number, fail: number, cancelled?: number}} totals */
const tap = (blocks, {pass, fail, cancelled = 0}) =>
  [
    'TAP version 13',
    ...blocks,
    `1..${pass + fail + cancelled}`,
    `# tests ${pass + fail + cancelled}`,
    '# suites 0',
    `# pass ${pass}`,
    `# fail ${fail}`,
    `# cancelled ${cancelled}`,
    '# skipped 0',
    '# todo 0',
    '',
  ].join('\n');
const assertionRun = tap([ok(1), notOk(2, 'AssertionError', 'ERR_ASSERTION')], {pass: 1, fail: 1});

test('a clean run passes and an assertion failure with status 1 is a detection', () => {
  assert.equal(verdict({status: 0, stdout: tap([ok(1), ok(2)], {pass: 2, fail: 0})}), 'pass');
  assert.equal(verdict({status: 1, stdout: assertionRun}), 'assertion failure');
});

test('the four misclassifications reported by the review are refused', () => {
  // A non-assertion failure whose message merely mentions ERR_ASSERTION.
  assert.equal(
    verdict({status: 1, stdout: tap([notOk(1, 'TypeError', 'ERR_TEST_FAILURE')], {pass: 0, fail: 1})}),
    'other failure',
  );
  // One assertion failure mixed with an unrelated TypeError.
  const mixed = tap([notOk(1, 'AssertionError', 'ERR_ASSERTION'), notOk(2, 'TypeError', 'ERR_TEST_FAILURE')], {
    pass: 0,
    fail: 2,
  });
  assert.equal(verdict({status: 1, stdout: mixed}), 'other failure');
  // An assertion report with an exit status other than 1.
  assert.equal(verdict({status: 2, stdout: assertionRun}), 'inconsistent report');
  assert.equal(verdict({status: 0, stdout: assertionRun}), 'inconsistent report');
});

test('process failures, missing or inconsistent reports and cancellations are never detections', () => {
  assert.equal(verdict({status: null, signal: 'SIGTERM', stdout: assertionRun}), 'process failure');
  assert.equal(verdict({status: 1, error: new Error('spawn failure'), stdout: assertionRun}), 'process failure');
  assert.equal(verdict({status: 1, stdout: ''}), 'no test report');
  assert.equal(
    verdict({status: 1, stdout: tap([notOk(1, 'AssertionError', 'ERR_ASSERTION')], {pass: 0, fail: 2})}),
    'inconsistent report',
  );
  assert.equal(verdict({status: 1, stdout: tap([ok(1)], {pass: 1, fail: 0, cancelled: 1})}), 'inconsistent report');
  assert.equal(verdict({status: 1, stdout: tap([ok(1), ok(2)], {pass: 2, fail: 0})}), 'inconsistent report');
});

test('only first-level diagnostic keys are read, not nested causes', () => {
  const nested = notOk(1, 'TypeError', 'ERR_TEST_FAILURE', [
    '  cause:',
    "    code: 'ERR_ASSERTION'",
    "    name: 'AssertionError'",
  ]);
  assert.equal(verdict({status: 1, stdout: tap([nested], {pass: 0, fail: 1})}), 'other failure');
});
