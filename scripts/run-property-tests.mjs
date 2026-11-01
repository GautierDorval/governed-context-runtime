// SPDX-License-Identifier: Apache-2.0
// One explicitly bounded development entrypoint, with identical file selection on Windows/Linux.
import {readFile, writeFile, mkdtemp, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import fc from 'fast-check';
import {runBounded, requireSuccess} from './property-process.mjs';
import {pythonVersion} from '../test/properties/python-oracle.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const canonicalIds = [
  'portable-key-order',
  'historical-key-order',
  'nfc-key-order',
  'json-insertion-order',
  'array-order',
  'json-escape-equivalence',
  'nfc-preservation',
  'nfc-collision',
  'portable-roundtrip',
  'text-profile',
  'text-whitespace-witnesses',
  'surrogate-rejection',
  'unit-envelope-coverage',
];
/** @type {{cases:Array<{id:string}>}} */
const vectors = JSON.parse(await readFile(join(root, 'test/properties/acceptance-vectors.json'), 'utf8'));
canonicalIds.push(...vectors.cases.map(v => 'vector-' + v.id));
const rawIds = [
  'raw-decoded-duplicates',
  'portable-number-lexemes',
  'historical-number-lexemes',
  'raw-number-boundaries',
  'raw-utf8',
  'raw-structure',
  'depth-boundary',
];
const archiveIds = [
  'archive-valid-controls',
  'archive-member-set',
  'archive-envelope-bytes',
  'archive-address-length',
  'archive-base64',
  'archive-fixed-boundaries',
];
const pythonIds = ['python-historical', 'python-nfc', 'python-text'];
// Independent declared budgets: reports cannot ratify a silently reduced generator count.
const declaredRuns = new Map([
  ...canonicalIds.map(
    id =>
      /** @type {[string,number]} */ ([id, id === 'text-whitespace-witnesses' || id.startsWith('vector-') ? 1 : 1000]),
  ),
  ...rawIds.map(
    id => /** @type {[string,number]} */ ([id, ['raw-number-boundaries', 'depth-boundary'].includes(id) ? 1 : 1000]),
  ),
  ...archiveIds.map(
    id =>
      /** @type {[string,number]} */ ([
        id,
        ['archive-valid-controls', 'archive-fixed-boundaries'].includes(id) ? 1 : 20,
      ]),
  ),
  ...pythonIds.map((id, i) => /** @type {[string,number]} */ ([id, i === 0 ? 5000 : 1000])),
]);
const files = [
  ['test/properties/canonicalization.test.mjs', canonicalIds],
  ['test/properties/strict-parse.test.mjs', rawIds],
  ['test/properties/archives.test.mjs', archiveIds],
  ['test/properties/harness.test.mjs', ['harness-controls']],
];
/** @type {Map<string,string>} */
const nodeProperties = new Map();
for (const [file, ids] of /** @type {Array<[string,string[]]>} */ (files))
  for (const id of ids) nodeProperties.set(id, file);
/** @type {Record<string,string>} */ const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const key = argv[i];
  if (
    !['--campaign', '--property', '--mutation', '--seed', '--path', '--timeout-ms'].includes(key) ||
    argv[i + 1] === undefined ||
    Object.hasOwn(args, key)
  )
    throw Error('unknown, repeated or missing argument: ' + key);
  args[key] = argv[i + 1];
}
let campaign = args['--campaign'] ?? 'all';
const only = args['--property'],
  mutation = args['--mutation'];
if (only) {
  if (!nodeProperties.has(only) && !pythonIds.includes(only)) throw Error('unknown property: ' + only);
  const inferred = pythonIds.includes(only) ? 'python' : 'node';
  if (args['--campaign'] && campaign !== inferred) throw Error('property/campaign mismatch');
  campaign = inferred;
}
if (mutation) {
  if (!['portable-sort', 'nfc-collision'].includes(mutation) || only) throw Error('invalid mutation selection');
  if (args['--campaign'] && campaign !== 'mutations') throw Error('mutation/campaign mismatch');
  campaign = 'mutations';
}
if (!['all', 'node', 'python', 'mutations'].includes(campaign)) throw Error('unknown campaign');
const seed = args['--seed'] === undefined ? undefined : Number(args['--seed']);
if (seed !== undefined && (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647))
  throw Error('seed must be a signed 32-bit integer');
const path = args['--path'];
if (path !== undefined && (!/^(?:\d+(?::\d+)*)?$/.test(path) || seed === undefined || (!only && !mutation)))
  throw Error('replay path requires one property or mutation and its seed');
const timeoutMs = args['--timeout-ms'] === undefined ? 120000 : Number(args['--timeout-ms']);
if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 120000)
  throw Error('timeout must be between 50 and 120000 ms');
const start = performance.now(),
  deadline = start + timeoutMs;
const temporaryBase = resolve(process.env.RUNNER_TEMP ?? tmpdir());
const relation = relative(root, temporaryBase);
if (!relation.startsWith('..') && !isAbsolute(relation)) throw Error('report directory must be outside the repository');
const reportDir = await mkdtemp(join(temporaryBase, 'gcr-properties-'));
/** @type {Array<Record<string,unknown>>} */ const phases = [];
/** @type {Record<string,unknown>} */ const report = {
  status: 'INCOMPLETE',
  campaign,
  selection: only ?? mutation ?? null,
  completeFixedSeedQualification: false,
  budgetMs: timeoutMs,
  reportDir,
  node: process.versions.node,
  fastCheck: fc.__version,
  phases,
};
/** @returns {number} */
const remaining = () => {
  const value = Math.floor(deadline - performance.now());
  if (value <= 0) throw Error('global property deadline exceeded');
  return value;
};
try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 24 || (major === 24 && minor < 17)) throw Error('Node 24.17.0 or newer required');
  if (fc.__version !== '4.10.2') throw Error('fast-check 4.10.2 required');
  const git = /** @param {string[]} parts */ parts =>
    execFileSync('git', ['-C', root, ...parts], {
      encoding: 'utf8',
      timeout: Math.min(5000, remaining()),
      maxBuffer: 65536,
    }).trim();
  const commit = git(['rev-parse', 'HEAD']),
    dirty = git(['status', '--porcelain=v1', '--untracked-files=all']) !== '';
  const python = await pythonVersion(undefined, Math.min(5000, remaining()));
  Object.assign(report, {testedCommit: commit, dirty, python, generatorVersion: 'lot03-v2'});
  const config = {only, mutation, seed, path, commit, dirty, python, reportDir};
  const env = {...process.env, GCR_PROPERTY_CONFIG: JSON.stringify(config)};
  /** @param {string} name @param {string[]} commandArgs */
  const phase = async (name, commandArgs) => {
    const result = await runBounded(process.execPath, commandArgs, {
      cwd: root,
      env,
      timeoutMs: remaining(),
      maxOutputBytes: 8 * 1024 * 1024,
    });
    await writeFile(join(reportDir, name + '.stdout.log'), result.stdout);
    await writeFile(join(reportDir, name + '.stderr.log'), result.stderr);
    phases.push({name, args: commandArgs, ...result, stdout: undefined, stderr: undefined});
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    requireSuccess(result, name);
    remaining();
  };
  if (campaign === 'all' || campaign === 'node') {
    const selected = only
      ? [/** @type {string} */ (nodeProperties.get(only))]
      : [...new Set(nodeProperties.values()), 'spec/reference/test-vectors.mjs'];
    await phase('node', [
      '--test',
      '--test-concurrency=1',
      '--test-timeout=' + Math.min(60000, remaining()),
      ...selected,
    ]);
  }
  if (campaign === 'all' || campaign === 'python') await phase('python', ['test/properties/python-oracle.mjs']);
  if (campaign === 'all' || campaign === 'mutations') await phase('mutations', ['scripts/test-property-mutations.mjs']);
  const expected =
    only && only !== 'harness-controls'
      ? [only]
      : only
        ? []
        : [
            ...(campaign === 'all' || campaign === 'node'
              ? [...nodeProperties.keys()].filter(id => id !== 'harness-controls')
              : []),
            ...(campaign === 'all' || campaign === 'python' ? pythonIds : []),
          ];
  const summaries = [];
  for (const id of expected) {
    const value = JSON.parse(await readFile(join(reportDir, id + '.json'), 'utf8'));
    if (
      value.property !== id ||
      value.requestedRuns !== declaredRuns.get(id) ||
      value.failed ||
      value.interrupted ||
      (path === undefined ? value.executedRuns !== value.requestedRuns : value.executedRuns < 1) ||
      value.skips !== 0
    )
      throw Error('incomplete property report: ' + id);
    summaries.push({
      property: id,
      runs: value.executedRuns,
      seed: value.seed,
      path: value.path,
      durationMs: value.durationMs,
    });
  }
  if ((campaign === 'all' || campaign === 'node') && (!only || only === 'harness-controls'))
    await readFile(join(reportDir, 'harness-controls.json'));
  if (campaign === 'all' || campaign === 'mutations') await readFile(join(reportDir, 'mutation-campaign.json'));
  Object.assign(report, {
    status: 'PASS',
    properties: summaries,
    propertyCount: summaries.length,
    completeFixedSeedQualification:
      !dirty &&
      campaign === 'all' &&
      seed === undefined &&
      path === undefined &&
      timeoutMs === 120000 &&
      summaries.length === declaredRuns.size,
  });
} catch (error) {
  report.status = 'FAIL';
  report.error = error instanceof Error ? {name: error.name, message: error.message} : String(error);
  process.exitCode = 1;
} finally {
  report.durationMs = Math.round(performance.now() - start);
  await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Property campaign ${report.status}; ${report.durationMs} ms; report: ${join(reportDir, 'report.json')}`);
}
