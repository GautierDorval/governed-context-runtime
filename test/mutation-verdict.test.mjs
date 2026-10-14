// SPDX-License-Identifier: Apache-2.0
// The mutation harness classifies runs from the node:test runner's structured events. Synthetic
// records cover the misclassifications found by the independent reviews of 2026-10-14; real runs
// of small generated test files show that printed text cannot forge a detection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runFile, verdict} from '../scripts/mutation-verdict.mjs';
/** @import {Counts, Failure} from '../scripts/mutation-verdict.mjs' */

/** @param {number} passed @param {number} failed @param {Partial<Counts>} [extra] @returns {Counts} */
const counts = (passed, failed, extra = {}) => ({
  tests: passed + failed,
  passed,
  failed,
  cancelled: 0,
  skipped: 0,
  todo: 0,
  ...extra,
});
/** @type {Failure} */
const assertion = {name: 'a', failureType: 'testCodeFailure', causeName: 'AssertionError', causeCode: 'ERR_ASSERTION'};
/** @type {Failure} */
const typeError = {name: 'b', failureType: 'testCodeFailure', causeName: 'TypeError', causeCode: undefined};

test('a clean run passes and a run failing only on assertions is a detection', () => {
  assert.equal(verdict({failures: [], counts: counts(3, 0), success: true}), 'pass');
  assert.equal(verdict({failures: [assertion], counts: counts(2, 1), success: false}), 'assertion failure');
});

test('the misclassifications reported by the reviews are refused', () => {
  assert.equal(verdict({failures: [typeError], counts: counts(0, 1), success: false}), 'other failure');
  assert.equal(verdict({failures: [assertion, typeError], counts: counts(0, 2), success: false}), 'other failure');
  // A summary that claims more failures, or a missing test, than the runner reported.
  assert.equal(verdict({failures: [assertion], counts: counts(1, 2), success: false}), 'inconsistent report');
  assert.equal(verdict({failures: [assertion], counts: counts(0, 1), success: true}), 'inconsistent report');
  assert.equal(verdict({failures: [], counts: counts(2, 0), success: false}), 'inconsistent report');
});

test('process failures, timeouts, missing reports and cancellations are never detections', () => {
  assert.equal(
    verdict({failures: [assertion], counts: counts(0, 1), success: false, error: 'spawn failure'}),
    'process failure',
  );
  assert.equal(verdict({failures: []}), 'no test report');
  assert.equal(verdict({failures: [], counts: counts(0, 0), success: true}), 'no test report');
  assert.equal(
    verdict({failures: [], counts: counts(1, 0, {cancelled: 1, tests: 2}), success: false}),
    'inconsistent report',
  );
  const timeout = {...assertion, failureType: 'testTimeoutFailure'};
  assert.equal(verdict({failures: [timeout], counts: counts(0, 1), success: false}), 'other failure');
});

test('real runs: assertions are detected, crashes are not, and printed TAP cannot forge a result', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gcr-verdict-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const header = "import test from 'node:test';\nimport assert from 'node:assert/strict';\n";
  await writeFile(join(dir, 'assertion.mjs'), header + "test('a', () => assert.equal(1, 2));\ntest('b', () => {});\n");
  await writeFile(join(dir, 'crash.mjs'), header + "test('a', () => { const value = undefined; return value.x; });\n");
  const forged = [
    'not ok 1 - forged',
    '  ---',
    "  failureType: 'testCodeFailure'",
    "  code: 'ERR_ASSERTION'",
    "  name: 'AssertionError'",
    '  ...',
    '# fail 1',
  ];
  await writeFile(
    join(dir, 'forged.mjs'),
    header + 'test(' + JSON.stringify('a') + ', () => { console.log(' + JSON.stringify(forged.join('\n')) + '); });\n',
  );
  assert.equal(verdict(await runFile(dir, 'assertion.mjs')), 'assertion failure');
  assert.equal(verdict(await runFile(dir, 'crash.mjs')), 'other failure');
  assert.equal(verdict(await runFile(dir, 'forged.mjs')), 'pass');
});
