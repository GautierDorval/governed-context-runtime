// SPDX-License-Identifier: Apache-2.0
// The mutation harness classifies runs from the node:test runner's structured events. Synthetic
// records cover the misclassifications found by the independent reviews of 2026-10-14; real runs
// of small generated test files show that printed text cannot forge a detection and that an
// abnormal end of the file's process, late activity or a stalled file is never a detection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runFile, verdict} from '../scripts/mutation-verdict.mjs';
/** @import {Counts, Failure, FileEnd, RunRecord} from '../scripts/mutation-verdict.mjs' */

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
/** @type {FileEnd} */
const passedEnd = {passed: true, failureType: undefined, exitCode: undefined, signal: undefined};
/** @type {FileEnd} */
const failedEnd = {passed: false, failureType: 'subtestsFailed', exitCode: 1, signal: undefined};
/** @param {Partial<RunRecord>} fields @returns {RunRecord} */
const failing = fields => ({
  failures: [assertion],
  counts: counts(1, 1),
  success: false,
  fileEnd: failedEnd,
  fileSummary: true,
  fileDiagnostics: 0,
  ...fields,
});

test('a clean run passes and a run failing only on assertions is a detection', () => {
  const clean = {
    failures: [],
    counts: counts(3, 0),
    success: true,
    fileEnd: passedEnd,
    fileSummary: true,
    fileDiagnostics: 0,
  };
  assert.equal(verdict(clean), 'pass');
  assert.equal(verdict(failing({})), 'assertion failure');
});

test('the misclassifications reported by the reviews are refused', () => {
  assert.equal(verdict(failing({failures: [typeError], counts: counts(0, 1)})), 'other failure');
  assert.equal(verdict(failing({failures: [assertion, typeError], counts: counts(0, 2)})), 'other failure');
  assert.equal(verdict(failing({counts: counts(1, 2)})), 'inconsistent report');
  assert.equal(verdict(failing({success: true})), 'inconsistent report');
  // An assertion followed by an abnormal end of the file's process.
  assert.equal(verdict(failing({fileEnd: {...failedEnd, exitCode: 7}})), 'inconsistent report');
  assert.equal(verdict(failing({fileEnd: {...failedEnd, signal: 'SIGTERM'}})), 'process failure');
  assert.equal(verdict(failing({fileSummary: false})), 'process failure');
  assert.equal(verdict(failing({fileDiagnostics: 1})), 'other failure');
  // Impossible arithmetic in the runner's counts.
  assert.equal(verdict(failing({counts: {...counts(0, 1), tests: 99}})), 'inconsistent report');
  assert.equal(verdict(failing({counts: {...counts(0, 1), tests: -1, passed: -2}})), 'inconsistent report');
});

test('process failures, deadlines, missing reports and cancellations are never detections', () => {
  assert.equal(verdict(failing({error: 'deadline of 100 ms exceeded'})), 'process failure');
  assert.equal(verdict(failing({fileEnd: undefined})), 'process failure');
  assert.equal(verdict(failing({counts: undefined})), 'no test report');
  assert.equal(
    verdict(failing({failures: [], counts: counts(0, 0), success: true, fileEnd: passedEnd})),
    'no test report',
  );
  assert.equal(verdict(failing({counts: counts(1, 1, {cancelled: 1, tests: 3})})), 'inconsistent report');
  assert.equal(verdict(failing({failures: [{...assertion, failureType: 'testTimeoutFailure'}]})), 'other failure');
});

test('real runs: only a clean assertion failure is a detection', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gcr-verdict-'));
  // Windows may keep the directory locked briefly after a stopped child process exits.
  t.after(() => rm(dir, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}));
  const header = "import test from 'node:test';\nimport assert from 'node:assert/strict';\n";
  const fails = "test('a', () => assert.equal(1, 2));\n";
  const forged = [
    'not ok 1 - forged',
    '  ---',
    "  failureType: 'testCodeFailure'",
    "  code: 'ERR_ASSERTION'",
    "  name: 'AssertionError'",
    '  ...',
    '# fail 1',
  ];
  const files = {
    'assertion.mjs': header + fails + "test('b', () => {});\n",
    'crash.mjs': header + "test('a', () => { const value = undefined; return value.x; });\n",
    'forged.mjs': header + "test('a', () => { console.log(" + JSON.stringify(forged.join('\n')) + '); });\n',
    'exit7.mjs': header + fails + 'setTimeout(() => process.exit(7), 100);\n',
    'sigterm.mjs': header + fails + "setTimeout(() => process.kill(process.pid, 'SIGTERM'), 100);\n",
    'late.mjs': header + fails + "setTimeout(() => { throw new Error('late'); }, 100);\n",
    'linger.mjs': header + fails + 'setTimeout(() => {}, 20000);\n',
  };
  for (const [name, body] of Object.entries(files)) await writeFile(join(dir, name), body);
  assert.equal(verdict(await runFile(dir, 'assertion.mjs')), 'assertion failure');
  assert.equal(verdict(await runFile(dir, 'crash.mjs')), 'other failure');
  assert.equal(verdict(await runFile(dir, 'forged.mjs')), 'pass');
  for (const name of ['exit7.mjs', 'sigterm.mjs', 'late.mjs'])
    assert.notEqual(verdict(await runFile(dir, name)), 'assertion failure', name);
  const started = Date.now();
  assert.equal(verdict(await runFile(dir, 'linger.mjs', 1500)), 'process failure');
  assert(Date.now() - started < 10000, 'the whole-run deadline bounds a file that does not exit');
});
