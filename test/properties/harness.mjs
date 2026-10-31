// SPDX-License-Identifier: Apache-2.0
import fc from 'fast-check';
import test from 'node:test';
import {AssertionError} from 'node:assert';
import {mkdirSync, mkdtempSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {BOUNDS} from './arbitraries.mjs';
/** @typedef {{id: string, profile: string, seed: number, runs?: number}} PropertyMeta */
/** @typedef {{only?: string, seed?: number, path?: string, reportDir?: string, context?: string,
 * commit?: string, dirty?: boolean, python?: string, fastCheck?: string, generatorVersion?: string, mutation?:string, subjectSha256?:string}} Configuration */
/** @type {Configuration | undefined} */
let cached;
/** @returns {Configuration} */
export function configuration() {
  if (cached) return cached;
  cached = process.env.GCR_PROPERTY_CONFIG ? JSON.parse(process.env.GCR_PROPERTY_CONFIG) : {};
  if (!cached) throw new Error('invalid property configuration');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  cached.commit ??= execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 65536,
  }).trim();
  cached.reportDir ??= mkdtempSync(join(tmpdir(), 'gcr-properties-direct-'));
  const relation = relative(root, cached.reportDir);
  if (!relation.startsWith('..') && !isAbsolute(relation))
    throw new Error('property reports must be outside the repository');
  cached.subjectSha256 ??= createHash('sha256')
    .update(readFileSync(new URL('../../spec/reference/verification.mjs', import.meta.url)))
    .digest('hex');
  return cached;
}
/** Only contractual assertions are translated into node:test assertion failures.
 * Interruptions, exhausted generators and unexpected exceptions remain harness failures.
 * @template T @param {fc.RunDetails<T>} result @param {string} reproduction
 */
export function assertPropertyResult(result, reproduction) {
  if (result.interrupted || (result.failed && result.errorInstance === null))
    throw new Error(`Incomplete property campaign (${result.numRuns} runs, ${result.numSkips} skips). ${reproduction}`);
  if (!result.failed) return;
  const cause = result.errorInstance;
  const refusal = cause instanceof Error && cause.constructor === Error && cause.name === 'VerificationError';
  // A valid generated input refused by the verifier violates the contract. Engine/import
  // exceptions remain harness failures, even when they originate inside the subject.
  if (!(cause instanceof Error) || (!(cause instanceof AssertionError) && !refusal))
    throw new Error(`Unexpected property exception. ${reproduction}`, {cause: result.errorInstance});
  throw new AssertionError({
    message: `${cause.message}\n${reproduction}`,
    actual: result.counterexample,
    expected: 'contract holds',
    operator: 'property',
  });
}
/** @template {unknown[]} T @param {PropertyMeta} meta @param {fc.IRawProperty<T>} property
 * @param {Configuration} [overrides] */
export async function runProperty(meta, property, overrides = {}) {
  const config = {...configuration(), ...overrides};
  const seed = config.seed ?? meta.seed;
  const parameters = {
    seed,
    numRuns: meta.runs ?? 1000,
    maxSkipsPerRun: 10,
    ...(config.path === undefined ? {} : {path: config.path}),
  };
  const started = performance.now();
  const result = await fc.check(property, parameters);
  const replayPath = result.counterexamplePath ?? config.path ?? '';
  const selection = config.mutation
    ? `--campaign mutations --mutation ${config.mutation}`
    : `--campaign ${meta.id.startsWith('python-') ? 'python' : 'node'} --property ${meta.id}`;
  const command = config.context?.startsWith('harness/')
    ? 'npm run test:properties -- --campaign node --property harness-controls'
    : `npm run test:properties -- ${selection} --seed ${result.seed} --path "${replayPath}"`;
  const report = {
    property: meta.id,
    profile: meta.profile,
    testedCommit: config.commit,
    dirty: config.dirty ?? true,
    versions: {
      node: process.versions.node,
      python: config.python ?? 'not probed in direct invocation',
      fastCheck: fc.__version,
    },
    generatorVersion: 'lot03-v2',
    subjectSha256: config.subjectSha256,
    context: config.context ?? 'candidate',
    seed: result.seed,
    path: replayPath,
    bounds: BOUNDS,
    requestedRuns: parameters.numRuns,
    executedRuns: result.numRuns,
    skips: result.numSkips,
    shrinks: result.numShrinks,
    interrupted: result.interrupted,
    failed: result.failed,
    counterexample: result.counterexample,
    counterexampleText: result.counterexample === null ? null : fc.stringify(result.counterexample),
    error:
      result.errorInstance instanceof Error
        ? {name: result.errorInstance.name, message: result.errorInstance.message}
        : result.errorInstance,
    reproduction: command,
    durationMs: Math.round(performance.now() - started),
  };
  if (!/^[a-z0-9-]+$/.test(meta.id)) throw new Error('unsafe property identifier');
  const dir = config.reportDir;
  if (!dir) throw new Error('missing report directory');
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, meta.id + '.json'), JSON.stringify(report, null, 2) + '\n');
  assertPropertyResult(result, command);
  return report;
}
/** @template {unknown[]} T @param {PropertyMeta} meta @param {fc.IRawProperty<T>} property
 * @param {Configuration} [overrides] */
export function propertyTest(meta, property, overrides = {}) {
  const only = overrides.only ?? configuration().only;
  if (only && only !== meta.id) return;
  test(meta.id, async () => {
    await runProperty(meta, property, overrides);
  });
}
