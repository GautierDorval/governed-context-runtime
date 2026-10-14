// SPDX-License-Identifier: Apache-2.0
// Runs one test file for the mutation harness and classifies the outcome from the structured
// events of the node:test runner (run() API), never from printed text: a test file cannot forge
// them by writing to its output. A mutant counts as detected only when the file's own process
// finished normally and reported its own summary, every failing top-level test failed on an
// assertion, no late activity was reported by the file, and the runner's counts agree.

import {run} from 'node:test';
import {join} from 'node:path';

/**
 * @typedef {{name: string, failureType: string | undefined, causeName: string | undefined, causeCode: string | undefined}} Failure
 * @typedef {{tests: number, passed: number, failed: number, cancelled: number, skipped: number, todo: number}} Counts
 * @typedef {{passed: boolean, failureType: string | undefined, exitCode: number | undefined, signal: string | undefined}} FileEnd
 * @typedef {{failures: Failure[], counts?: Counts, success?: boolean, fileEnd?: FileEnd, fileSummary?: boolean,
 *   fileDiagnostics?: number, error?: string}} RunRecord
 * @typedef {'pass' | 'assertion failure' | 'process failure' | 'no test report' | 'inconsistent report' | 'other failure'} Verdict
 */

/**
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
const member = (value, key) =>
  value && typeof value === 'object' && key in value ? /** @type {Record<string, unknown>} */ (value)[key] : undefined;
/** @param {unknown} value @returns {string | undefined} */
const text = value => (value === undefined || value === null ? undefined : String(value));

/**
 * Runs one file in its own process, under a whole-run deadline, and records the runner's events.
 * @param {string} cwd
 * @param {string} file
 * @param {number} [timeout] milliseconds for the whole file, process exit included
 * @returns {Promise<RunRecord>}
 */
export async function runFile(cwd, file, timeout = 120000) {
  const target = join(cwd, file);
  /** @type {RunRecord} */
  const record = {failures: [], fileSummary: false, fileDiagnostics: 0};
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), timeout);
  // A run nested in an outer test runner only reports its own files once the child context marker
  // is absent from this process; it is restored afterwards. Calls must not overlap.
  const context = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    for await (const event of run({
      files: [target],
      cwd,
      isolation: 'process',
      concurrency: 1,
      timeout,
      signal: deadline.signal,
    })) {
      const data = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (event.data));
      const fromFile = data.name === target;
      if (event.type === 'test:fail' && data.nesting === 0 && !fromFile) {
        const error = member(data.details, 'error');
        record.failures.push({
          name: String(data.name),
          failureType: text(member(error, 'failureType')),
          causeName: text(member(member(error, 'cause'), 'name')),
          causeCode: text(member(member(error, 'cause'), 'code')),
        });
      } else if (event.type === 'test:complete' && data.nesting === 0 && fromFile) {
        const error = member(data.details, 'error');
        const exitCode = member(error, 'exitCode');
        record.fileEnd = {
          passed: member(data.details, 'passed') === true,
          failureType: text(member(error, 'failureType')),
          exitCode: typeof exitCode === 'number' ? exitCode : undefined,
          signal: text(member(error, 'signal')),
        };
      } else if (event.type === 'test:summary') {
        if (data.file === target) record.fileSummary = true;
        if (data.file === undefined) {
          record.counts = /** @type {Counts} */ (data.counts);
          record.success = data.success === true;
        }
      } else if (event.type === 'test:diagnostic' && data.file === target) {
        // Diagnostics emitted by the file itself, such as activity after a test has ended.
        record.fileDiagnostics = (record.fileDiagnostics ?? 0) + 1;
      }
    }
    if (deadline.signal.aborted) record.error = 'deadline of ' + timeout + ' ms exceeded';
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timer);
    if (context !== undefined) process.env.NODE_TEST_CONTEXT = context;
  }
  return record;
}

/** @param {Counts} counts */
const consistent = counts =>
  Object.values(counts).every(value => Number.isInteger(value) && value >= 0) &&
  counts.tests === counts.passed + counts.failed + counts.cancelled + counts.skipped + counts.todo;

/**
 * @param {RunRecord} record
 * @returns {Verdict}
 */
export function verdict(record) {
  if (record.error) return 'process failure';
  // The file's process must have ended on its own, with its own summary and no signal.
  if (!record.fileSummary || !record.fileEnd || record.fileEnd.signal) return 'process failure';
  if ((record.fileDiagnostics ?? 0) > 0) return 'other failure';
  const counts = record.counts;
  if (!counts) return 'no test report';
  const {tests, passed, failed, cancelled, skipped, todo} = counts;
  if (!consistent({tests, passed, failed, cancelled, skipped, todo})) return 'inconsistent report';
  if (tests === 0) return 'no test report';
  if (cancelled > 0 || record.failures.length !== failed) return 'inconsistent report';
  const exitCode = record.fileEnd.exitCode ?? 0;
  if (failed === 0)
    return record.success === true && record.fileEnd.passed && exitCode === 0 ? 'pass' : 'inconsistent report';
  if (record.success !== false || record.fileEnd.passed || exitCode !== 1) return 'inconsistent report';
  const assertions = record.failures.every(
    failure =>
      failure.failureType === 'testCodeFailure' &&
      failure.causeName === 'AssertionError' &&
      failure.causeCode === 'ERR_ASSERTION',
  );
  return assertions ? 'assertion failure' : 'other failure';
}
