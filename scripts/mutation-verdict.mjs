// SPDX-License-Identifier: Apache-2.0
// Classifies one `node --test --test-reporter=tap` run of the mutation harness. A run is a pass
// only with exit status 0 and no failure; it is an assertion failure only with exit status 1, a
// complete and consistent TAP summary, and every failing test reporting an assertion error at the
// top level of its diagnostic block. Every other result is reported by name and never counts as
// a detected mutant.

/**
 * @typedef {{status: number | null, signal?: string | null, error?: Error, stdout?: string | null, stderr?: string | null}} RunResult
 * @typedef {'pass' | 'assertion failure' | 'process failure' | 'no test report' | 'inconsistent report' | 'other failure'} Verdict
 */

/**
 * @param {string} output
 * @param {string} label
 */
const count = (output, label) => {
  const match = new RegExp('^# ' + label + ' (\\d+)$', 'm').exec(output);
  return match ? Number(match[1]) : Number.NaN;
};

/**
 * Top-level failing tests with the first-level keys of their diagnostic blocks.
 * @param {string} output
 */
export function failures(output) {
  const lines = output.split(/\r?\n/);
  /** @type {{name: string, keys: Record<string, string>}[]} */
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const head = /^not ok \d+ - (.*)$/.exec(lines[i]);
    if (!head) continue;
    /** @type {Record<string, string>} */
    const keys = {};
    for (let j = i + 1; j < lines.length && !/^(?:ok|not ok) \d+ /.test(lines[j]) && !/^# /.test(lines[j]); j++) {
      const key = /^ {2}(failureType|code|name): '([^']*)'$/.exec(lines[j]);
      if (key && !(key[1] in keys)) keys[key[1]] = key[2];
    }
    found.push({name: head[1], keys});
  }
  return found;
}

/**
 * @param {RunResult} result
 * @returns {Verdict}
 */
export function verdict(result) {
  if (result.error || result.signal || result.status === null) return 'process failure';
  const output = result.stdout ?? '';
  const [tests, passed, failed, cancelled, skipped, todo] = [
    'tests',
    'pass',
    'fail',
    'cancelled',
    'skipped',
    'todo',
  ].map(label => count(output, label));
  if (![tests, passed, failed, cancelled, skipped, todo].every(Number.isInteger) || tests === 0)
    return 'no test report';
  const failing = failures(output);
  if (passed + failed + cancelled + skipped + todo !== tests || failing.length !== failed || cancelled > 0)
    return 'inconsistent report';
  if (failed === 0) return result.status === 0 ? 'pass' : 'inconsistent report';
  if (result.status !== 1) return 'inconsistent report';
  const assertion = failing.every(
    ({keys}) =>
      keys.failureType === 'testCodeFailure' && keys.code === 'ERR_ASSERTION' && keys.name === 'AssertionError',
  );
  return assertion ? 'assertion failure' : 'other failure';
}
