// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {mkdtemp, readFile, writeFile, stat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runBounded, requireSuccess} from '../../scripts/property-process.mjs';
import {historicalValue, jsonValue, unicodeString} from './arbitraries.mjs';
import {runProperty, configuration} from './harness.mjs';
import {canonical, textBytes} from '../../spec/reference/verification.mjs';
import {equalBytes} from './oracles.mjs';
/** @import {Configuration} from './harness.mjs' */
export const PYTHON_VERSION = '3.14.9';
/** @param {string} [executable] @param {number} [timeoutMs] */
export async function pythonVersion(executable = process.env.GCR_PROPERTY_PYTHON ?? 'python', timeoutMs = 5000) {
  const result = await runBounded(executable, ['-I', '-B', '-c', 'import platform; print(platform.python_version())'], {
    timeoutMs,
    maxOutputBytes: 65536,
  });
  requireSuccess(result, 'required Python interpreter');
  const version = result.stdout.trim();
  if (version !== PYTHON_VERSION) throw new Error(`Python ${PYTHON_VERSION} required, observed ${version}`);
  return version;
}
/** @typedef {'historical'|'nfc'|'text'} Family */
/** @typedef {{historical:unknown[],nfc:unknown[],text:unknown[]}} Inputs */
/** @typedef {{version:string,unicodeVersion:string,historical:string[],nfc:string[],text:string[]}} Output */
/** Test-only controls remain in this development module, never in the public verifier.
 * @param {Configuration & {pythonExecutable?:string,referenceScript?:string,count?:number}} [options] */
export async function runPythonOracle(options = {}) {
  const config = {...configuration(), ...options};
  const executable = options.pythonExecutable ?? process.env.GCR_PROPERTY_PYTHON ?? 'python';
  const version = await pythonVersion(executable);
  const temporaryBase = resolve(tmpdir()),
    dir = await mkdtemp(join(temporaryBase, 'gcr-python-oracle-'));
  const script = options.referenceScript ?? fileURLToPath(new URL('./python-oracle.py', import.meta.url));
  const started = performance.now(),
    deadline = started + 30000;
  let exchanges = 0;
  /** @param {Inputs} input @returns {Promise<Output>} */
  const exchange = async input => {
    const serialized = JSON.stringify(input);
    if (Buffer.byteLength(serialized) > 8 * 1024 * 1024) throw Error('oracle input limit');
    const inputPath = join(dir, 'input.json'),
      outputPath = join(dir, 'output.json');
    await writeFile(inputPath, serialized);
    await rm(outputPath, {force: true});
    const remaining = Math.floor(deadline - performance.now());
    if (remaining <= 0) throw Error('Python campaign deadline exceeded');
    const result = await runBounded(executable, ['-I', '-B', script, inputPath, outputPath], {
      timeoutMs: remaining,
      maxOutputBytes: 65536,
    });
    exchanges++;
    requireSuccess(result, 'Python differential oracle');
    if ((await stat(outputPath)).size > 32 * 1024 * 1024) throw Error('oracle output limit');
    const out = /** @type {Output} */ (JSON.parse(await readFile(outputPath, 'utf8')));
    if (out.version !== version) throw Error('oracle version mismatch');
    for (const key of /** @type {Family[]} */ (['historical', 'nfc', 'text']))
      if (
        !Array.isArray(out[key]) ||
        out[key].length !== input[key].length ||
        out[key].some(x => typeof x !== 'string')
      )
        throw Error('incomplete oracle response: ' + key);
    return out;
  };
  try {
    /** @type {Array<{family:Family,id:string,profile:string,seed:number,count:number,arbitrary:fc.Arbitrary<unknown>}>} */
    const availableCampaigns = [
      {
        family: 'historical',
        id: 'python-historical',
        profile: 'deterministic-json-sort-keys-v0',
        seed: 31401,
        count: options.count ?? 5000,
        arbitrary: historicalValue,
      },
      {
        family: 'nfc',
        id: 'python-nfc',
        profile: 'gd-deterministic-json-v1',
        seed: 31402,
        count: options.count ?? 1000,
        arbitrary: jsonValue(3, false, 4),
      },
      {
        family: 'text',
        id: 'python-text',
        profile: 'utf8-nfc-lf-trimmed-v0',
        seed: 31403,
        count: options.count ?? 1000,
        arbitrary: unicodeString,
      },
    ];
    const campaigns = availableCampaigns.filter(c => !config.only || c.id === config.only);
    if (!campaigns.length) throw Error('unknown Python property selection');
    /** @type {Inputs} */ const input = {historical: [], nfc: [], text: []};
    for (const c of campaigns) {
      // Same deterministic property stream as the comparison below, with no SUT selection.
      const collection = fc.check(
        fc.property(c.arbitrary, value => {
          input[c.family].push(value);
        }),
        {seed: config.seed ?? c.seed, numRuns: c.count},
      );
      assert.equal(collection.failed, false);
      assert.equal(collection.interrupted, false);
      assert.equal(collection.numSkips, 0);
    }
    const expected = await exchange(input);
    const reports = [];
    for (const c of campaigns) {
      const cache = new Map(input[c.family].map((value, i) => [JSON.stringify(value), expected[c.family][i]]));
      const property = fc.asyncProperty(c.arbitrary, async value => {
        const key = JSON.stringify(value);
        let oracle = cache.get(key);
        if (oracle === undefined) {
          // A novel reduced counterexample is checked independently, within the same deadline.
          const one = {historical: [], nfc: [], text: []};
          /** @type {unknown[]} */ (one[c.family]).push(value);
          oracle = (await exchange(one))[c.family][0];
          cache.set(key, oracle);
        }
        /** @type {Uint8Array | undefined} */ let actual;
        assert.doesNotThrow(() => {
          actual =
            c.family === 'text'
              ? textBytes(/** @type {string} */ (value))
              : canonical(value, {historical: true, nfc: c.family === 'nfc'});
        }, 'constructed admitted value must be accepted');
        assert(actual instanceof Uint8Array);
        equalBytes(actual, oracle);
      });
      reports.push(
        await runProperty({id: c.id, profile: c.profile, seed: c.seed, runs: c.count}, property, {
          ...config,
          python: version,
        }),
      );
    }
    if (performance.now() > deadline) throw Error('Python campaign deadline exceeded');
    const result = {
      python: version,
      unicodeVersion: expected.unicodeVersion,
      exchanges,
      durationMs: Math.round(performance.now() - started),
      counts: Object.fromEntries(campaigns.map(c => [c.family, c.count])),
      reports: reports.map(r => ({
        property: r.property,
        seed: r.seed,
        runs: r.executedRuns,
        skips: r.skips,
        failed: r.failed,
      })),
    };
    if (config.reportDir)
      await writeFile(join(config.reportDir, 'python-campaign.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
    return result;
  } finally {
    // Only the fresh direct child returned by mkdtemp is eligible for cleanup.
    if (dirname(resolve(dir)) !== temporaryBase || !dir.startsWith(join(temporaryBase, 'gcr-python-oracle-')))
      throw Error('unsafe oracle cleanup path');
    await rm(dir, {recursive: true, force: true});
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runPythonOracle();
