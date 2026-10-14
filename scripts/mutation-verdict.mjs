// SPDX-License-Identifier: Apache-2.0
// Runs one test file for the mutation harness and classifies the outcome from the structured
// events of the node:test runner (run() API), never from printed text: a test file cannot forge
// them by writing to its output. A mutant counts as detected only when every failing top-level
// test failed on an assertion and the runner's own summary agrees.
import {run} from 'node:test';
import {join} from 'node:path';

/**
 * @typedef {{name: string, failureType: string | undefined, causeName: string | undefined, causeCode: string | undefined}} Failure
 * @typedef {{tests: number, passed: number, failed: number, cancelled: number, skipped: number, todo: number}} Counts
 * @typedef {{failures: Failure[], counts?: Counts, success?: boolean, error?: string}} RunRecord
 * @typedef {'pass' | 'assertion failure' | 'process failure' | 'no test report' | 'inconsistent report' | 'other failure'} Verdict
 */

/**
 * @param {unknown} value
 * @param {string} key
 * @returns {string | undefined}
 */
const field = (value, key) => {
  if (!value || typeof value !== 'object' || !(key in value)) return undefined;
  const found = /** @type {Record<string, unknown>} */ (value)[key];
  return found === undefined || found === null ? undefined : String(found);
};

/**
 * Runs one file in its own process and records the runner's events.
 * @param {string} cwd
 * @param {string} file
 * @param {number} [timeout]
 * @returns {Promise<RunRecord>}
 */
export async function runFile(cwd, file, timeout = 120000) {
  /** @type {RunRecord} */
  const record = {failures: []};
  // A run nested in an outer test runner only reports its own files once the child context marker
  // is absent from this process; it is restored afterwards.
  const context = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    for await (const event of run({
      files: [join(cwd, file)],
      cwd,
      isolation: 'process',
      concurrency: 1,
      timeout,
    })) {
      if (event.type === 'test:fail' && event.data.nesting === 0) {
        const error = event.data.details.error;
        record.failures.push({
          name: event.data.name,
          failureType: field(error, 'failureType'),
          causeName: field(error.cause, 'name'),
          causeCode: field(error.cause, 'code'),
        });
      }
      // The summary without a file is the runner's total for this run.
      if (event.type === 'test:summary' && event.data.file === undefined) {
        record.counts = event.data.counts;
        record.success = event.data.success;
      }
    }
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
  } finally {
    if (context !== undefined) process.env.NODE_TEST_CONTEXT = context;
  }
  return record;
}

/**
 * @param {RunRecord} record
 * @returns {Verdict}
 */
export function verdict(record) {
  if (record.error) return 'process failure';
  const counts = record.counts;
  if (!counts || counts.tests === 0) return 'no test report';
  if (counts.cancelled > 0 || record.failures.length !== counts.failed) return 'inconsistent report';
  if (counts.failed === 0) return record.success === true ? 'pass' : 'inconsistent report';
  if (record.success !== false) return 'inconsistent report';
  const assertions = record.failures.every(
    failure =>
      failure.failureType === 'testCodeFailure' &&
      failure.causeName === 'AssertionError' &&
      failure.causeCode === 'ERR_ASSERTION',
  );
  return assertions ? 'assertion failure' : 'other failure';
}
