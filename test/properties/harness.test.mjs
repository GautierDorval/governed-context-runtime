// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {mkdtemp, writeFile, readFile, readdir, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {configuration, assertPropertyResult} from './harness.mjs';
import {runFile, verdict} from '../../scripts/mutation-verdict.mjs';
import {runBounded} from '../../scripts/property-process.mjs';
import {replaceUnique} from '../../scripts/test-property-mutations.mjs';
import {historicalValue, pythonValue, pythonText, numericKeyPair} from './arbitraries.mjs';
const config = configuration(),
  root = fileURLToPath(new URL('../../', import.meta.url));
if (!config.only || config.only === 'harness-controls')
  test('harness-controls', async () => {
    const base = resolve(tmpdir()),
      dir = await mkdtemp(join(base, 'gcr-property-controls-'));
    const moduleURL = /** @param {string} p */ p => JSON.stringify(pathToFileURL(join(root, p)).href);
    const header = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fc from ${moduleURL('node_modules/fast-check/lib/fast-check.js')};\nimport {runProperty} from ${moduleURL('test/properties/harness.mjs')};\n`;
    const records = [];
    const codepoints = /** @param {string} a @param {string} b */ (a, b) => {
      const left = Array.from(a, c => c.codePointAt(0) ?? 0),
        right = Array.from(b, c => c.codePointAt(0) ?? 0);
      for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i];
      return left.length - right.length;
    };
    const coverage = [];
    for (const [arbitrary, seed, numRuns] of /** @type {const} */ ([
      [historicalValue, 31401, 5000],
      [pythonValue(), 31402, 1000],
    ])) {
      const values = fc.sample(arbitrary, {seed, numRuns});
      const keySets = values.flatMap(v =>
        v !== null && typeof v === 'object' && !Array.isArray(v) ? [Object.keys(v)] : [],
      );
      const ordering = keySets.filter(
        keys => JSON.stringify([...keys].sort()) !== JSON.stringify([...keys].sort(codepoints)),
      ).length;
      const numeric = keySets.filter(keys => keys.some(k => /^(0|[1-9][0-9]*)$/.test(k))).length;
      assert(ordering > 0, 'Python stream must distinguish UTF-16 from code-point key order');
      assert(numeric > 0, 'Python stream must include numeric keys');
      coverage.push({seed, numRuns, ordering, numeric});
    }
    const texts = fc.sample(pythonText, {seed: 31403, numRuns: 1000});
    for (const point of [0x1c, 0x1d, 0x1e, 0x1f, 0x85, 0xfeff])
      assert(
        texts.some(v => v.startsWith(String.fromCodePoint(point)) || v.endsWith(String.fromCodePoint(point))),
        'Python text stream must exercise distinct trim boundaries: ' + point,
      );
    for (const [short, long] of fc.sample(numericKeyPair, {seed: 31003, numRuns: 100})) {
      assert(Number(short) < Number(long));
      assert(long < short);
    }
    try {
      for (const [id, body, expected] of [
        ['control-true', 'assert.equal(n,n)', 'pass'],
        ['control-assertion', 'assert.equal(n,n+1)', 'assertion failure'],
        ['control-type-error', "throw new TypeError('deliberate harness exception')", 'other failure'],
      ]) {
        const options = {...config, reportDir: join(config.reportDir ?? dir, 'controls', id), context: 'harness/' + id};
        await writeFile(
          join(dir, 'control.mjs'),
          header +
            `test(${JSON.stringify(id)},()=>runProperty({id:${JSON.stringify(id)},profile:'harness-control',seed:31501,runs:10},fc.property(fc.integer(),n=>{${body};}),${JSON.stringify(options)}));\n`,
        );
        const result = await runFile(dir, 'control.mjs', 10000);
        records.push({id, expected, observed: verdict(result), result});
        assert.equal(verdict(result), expected, id);
        if (id === 'control-assertion')
          assert.equal(result.fileEnd?.exitCode, 1, 'a contractual violation really exits nonzero');
      }
      for (const [id, index, replacement, errorName] of /** @type {const} */ ([
        [
          'subject-reference-error',
          0,
          'const keys = [...normalized.keys()].sort(missingComparator);',
          'ReferenceError',
        ],
        ['subject-type-error', 0, 'const keys = [...normalized.keys()].sort(42);', 'TypeError'],
        [
          'rejection-type-error',
          1,
          "if (normalized.has(k)) throw new TypeError('subject collision crash');",
          'TypeError',
        ],
      ])) {
        const outputDir = join(config.reportDir ?? dir, 'controls', id);
        const options = {...config, mutation: id, reportDir: outputDir};
        await writeFile(
          join(dir, 'control.mjs'),
          `import test from 'node:test';import {MUTATIONS,runPropertyMutations} from ${moduleURL('scripts/test-property-mutations.mjs')};\n` +
            `MUTATIONS.push({...MUTATIONS[${index}],id:${JSON.stringify(id)},to:${JSON.stringify(replacement)}});\n` +
            `test(${JSON.stringify(id)},()=>runPropertyMutations(${JSON.stringify(options)}));\n`,
        );
        const result = await runFile(dir, 'control.mjs', 15000);
        assert.equal(verdict(result), 'other failure', id + ' must invalidate the mutation campaign');
        assert.equal(result.fileEnd?.exitCode, 1);
        const campaign = JSON.parse(await readFile(join(outputDir, 'mutation-campaign.json'), 'utf8'));
        assert.deepEqual(
          campaign.records.map(/** @param {{classification:string}} r */ r => r.classification),
          ['pass', 'pass', 'other failure'],
        );
        const property = index === 0 ? 'portable-key-order' : 'nfc-collision';
        const failed = JSON.parse(
          await readFile(join(outputDir, 'mutations', id, 'mutant', property + '.json'), 'utf8'),
        );
        assert.equal(failed.error.name, errorName);
        records.push({
          id,
          expected: 'other failure',
          observed: verdict(result),
          result,
          subjectError: failed.error,
          controls: campaign.records,
        });
      }
      const refusalOptions = {
        ...config,
        only: 'portable-key-order',
        reportDir: join(config.reportDir ?? dir, 'controls', 'subject-refusal'),
      };
      await writeFile(
        join(dir, 'control.mjs'),
        `import * as reference from ${moduleURL('spec/reference/verification.mjs')};\n` +
          `import {registerCanonicalization} from ${moduleURL('test/properties/canonicalization.test.mjs')};\n` +
          `registerCanonicalization({...reference,canonical(){reference.fail('deliberate_unexpected_refusal')}},${JSON.stringify(refusalOptions)});\n`,
      );
      const refusal = await runFile(dir, 'control.mjs', 10000);
      assert.equal(verdict(refusal), 'assertion failure');
      const refusalReport = JSON.parse(
        await readFile(join(refusalOptions.reportDir, 'portable-key-order.json'), 'utf8'),
      );
      assert.equal(refusalReport.error.name, 'VerificationError');
      records.push({id: 'subject-refusal', expected: 'assertion failure', observed: verdict(refusal), result: refusal});

      // A failed full request must not advertise a complete qualification.
      const failedBase = join(dir, 'failed-full-reports');
      await mkdir(failedBase);
      const failedFull = await runBounded(process.execPath, [join(root, 'scripts/run-property-tests.mjs')], {
        cwd: root,
        timeoutMs: 10000,
        env: {...process.env, RUNNER_TEMP: failedBase, GCR_PROPERTY_PYTHON: join(dir, 'absent-python.exe')},
      });
      assert.equal(failedFull.code, 1);
      assert.equal(failedFull.timedOut, false);
      const reportDirs = await readdir(failedBase);
      assert.equal(reportDirs.length, 1);
      const failedSummary = JSON.parse(await readFile(join(failedBase, reportDirs[0], 'report.json'), 'utf8'));
      assert.equal(failedSummary.status, 'FAIL');
      assert.equal(failedSummary.completeFixedSeedQualification, false);
      const skipped = fc.check(
        fc.property(fc.integer(), () => fc.pre(false)),
        {numRuns: 5, maxSkipsPerRun: 1},
      );
      assert(skipped.failed);
      assert(skipped.numSkips > 0);
      assert.throws(
        () => assertPropertyResult(skipped, 'skip-control'),
        error => error instanceof Error && !(error instanceof assert.AssertionError),
      );
      const interrupted = fc.check(
        fc.property(fc.integer(), () => true),
        {numRuns: 1000, plugins: [fc.interruptAfterTimeLimit(0, {failOnInterrupt: true})]},
      );
      assert(interrupted.interrupted);
      assert.throws(
        () => assertPropertyResult(interrupted, 'interrupt-control'),
        error => error instanceof Error && !(error instanceof assert.AssertionError),
      );
      const sentinel = join(dir, 'started.txt');
      const stalled = await runBounded(
        process.execPath,
        ['-e', "require('node:fs').writeFileSync(process.argv[1],'started');while(true){}", sentinel],
        {timeoutMs: 1200, maxOutputBytes: 4096},
      );
      assert.equal(await readFile(sentinel, 'utf8'), 'started');
      assert.equal(stalled.timedOut, true);
      assert.notEqual(stalled.code, 0);
      const flood = await runBounded(process.execPath, ['-e', "process.stdout.write('x'.repeat(65536))"], {
        timeoutMs: 3000,
        maxOutputBytes: 1024,
      });
      assert.equal(flood.overflow, true);
      assert.throws(() => replaceUnique('unrelated', 'target', 'replacement'), /exactly once/);
      assert.throws(() => replaceUnique('target target', 'target', 'replacement'), /exactly once/);
      const pythonModule = moduleURL('test/properties/python-oracle.mjs');
      await writeFile(
        join(dir, 'control.mjs'),
        `import test from 'node:test';import {pythonVersion} from ${pythonModule};test('missing-python',()=>pythonVersion(${JSON.stringify(join(dir, 'missing-python.exe'))},1000));`,
      );
      const absent = await runFile(dir, 'control.mjs', 5000);
      assert.equal(verdict(absent), 'other failure');
      records.push({id: 'missing-python', expected: 'other failure', observed: verdict(absent), result: absent});
      const falseOracle = join(dir, 'false-oracle.py');
      await writeFile(
        falseOracle,
        "import json,pathlib,platform,sys\nv=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))\nr={k:['\\\"incorrect\\\"']*len(v[k]) for k in ['historical','nfc','text']}\nr.update(version=platform.python_version(),unicodeVersion='deliberately false test oracle')\npathlib.Path(sys.argv[2]).write_text(json.dumps(r),encoding='utf-8')\n",
      );
      const oracleConfig = {
        ...config,
        only: 'python-historical',
        count: 3,
        referenceScript: falseOracle,
        reportDir: join(config.reportDir ?? dir, 'controls', 'false-oracle'),
        context: 'harness/false-oracle',
      };
      await writeFile(
        join(dir, 'control.mjs'),
        `import test from 'node:test';import {runPythonOracle} from ${pythonModule};test('oracle-divergence',()=>runPythonOracle(${JSON.stringify(oracleConfig)}));`,
      );
      const divergence = await runFile(dir, 'control.mjs', 15000);
      assert.equal(verdict(divergence), 'assertion failure');
      assert.equal(divergence.fileEnd?.exitCode, 1);
      records.push({
        id: 'oracle-divergence',
        expected: 'assertion failure',
        observed: verdict(divergence),
        result: divergence,
      });
      if (config.reportDir)
        await writeFile(
          join(config.reportDir, 'harness-controls.json'),
          JSON.stringify(
            {
              records,
              coverage,
              failedFull: failedSummary,
              skips: {failed: skipped.failed, count: skipped.numSkips},
              interruption: {failed: interrupted.failed, interrupted: interrupted.interrupted},
              stalled,
              flood,
            },
            null,
            2,
          ) + '\n',
        );
    } finally {
      if (dirname(resolve(dir)) !== base || !dir.startsWith(join(base, 'gcr-property-controls-')))
        throw Error('unsafe control cleanup path');
      await rm(dir, {recursive: true, force: true});
    }
  });
