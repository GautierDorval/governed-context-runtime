// SPDX-License-Identifier: Apache-2.0
import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {runFile, verdict} from './mutation-verdict.mjs';
import {configuration} from '../test/properties/harness.mjs';
/** @import {Configuration} from '../test/properties/harness.mjs' */
export const MUTATIONS = [
  {
    id: 'portable-sort',
    property: 'portable-key-order',
    from: 'const keys = [...normalized.keys()].sort(historical ? codepointCompare : undefined);',
    to: 'const keys = [...normalized.keys()].sort(codepointCompare);',
  },
  {
    id: 'nfc-collision',
    property: 'nfc-collision',
    from: "if (normalized.has(k)) fail('normalized_key_collision');",
    to: '// deliberate test mutation: collision guard removed',
  },
];
/** @param {string} source @param {string} from @param {string} to */
export function replaceUnique(source, from, to) {
  if (!from || source.split(from).length !== 2) throw new Error('mutation target must occur exactly once');
  return source.replace(from, () => to);
}
/** @param {Configuration & {mutation?:string}} [options] */
export async function runPropertyMutations(options = {}) {
  const config = {...configuration(), ...options};
  const base = resolve(tmpdir()),
    dir = await mkdtemp(join(base, 'gcr-property-mutants-'));
  const original = await readFile(new URL('../spec/reference/verification.mjs', import.meta.url), 'utf8');
  const tests = fileURLToPath(new URL('../test/properties/canonicalization.test.mjs', import.meta.url));
  const started = performance.now(),
    deadline = started + 120000;
  const selected = MUTATIONS.filter(m => !config.mutation || m.id === config.mutation);
  if (!selected.length) throw Error('unknown mutation');
  const records = [];
  try {
    for (const mutation of selected) {
      const altered = replaceUnique(original, mutation.from, mutation.to);
      for (const [context, source] of [
        ['original', original],
        ['equivalent', original + '\n// equivalent development rewrite\n'],
        ['mutant', altered],
      ]) {
        const reportDir = join(config.reportDir ?? dir, 'mutations', mutation.id, context);
        await mkdir(reportDir, {recursive: true});
        const subject = join(dir, 'verification.mjs');
        await writeFile(subject, source);
        const localConfig = {
          ...config,
          only: mutation.property,
          context: mutation.id + '/' + context,
          reportDir,
          path: context === 'mutant' ? config.path : undefined,
          mutation: context === 'mutant' ? mutation.id : undefined,
          subjectSha256: createHash('sha256').update(source).digest('hex'),
        };
        await writeFile(
          join(dir, 'probe.mjs'),
          `import {registerCanonicalization} from ${JSON.stringify(pathToFileURL(tests).href)};\nimport * as subject from './verification.mjs';\nregisterCanonicalization(subject,${JSON.stringify(localConfig)});\n`,
        );
        const remaining = Math.floor(deadline - performance.now());
        if (remaining <= 0) throw Error('mutation campaign deadline exceeded');
        const result = await runFile(dir, 'probe.mjs', remaining),
          classification = verdict(result);
        records.push({
          mutation: mutation.id,
          context,
          classification,
          result,
          subjectSha256: localConfig.subjectSha256,
          reportDir,
        });
        if (config.reportDir)
          await writeFile(
            join(config.reportDir, 'mutation-campaign.json'),
            JSON.stringify({status: 'IN_PROGRESS', records}, null, 2) + '\n',
          );
        if (context !== 'mutant' && classification !== 'pass')
          throw Error(`invalid ${context} control for ${mutation.id}: ${classification}`);
        if (
          context === 'mutant' &&
          (classification !== 'assertion failure' ||
            result.failures.length !== 1 ||
            result.failures[0].name !== mutation.property)
        )
          throw Error(`mutation ${mutation.id} was not detected by the expected property assertion: ${classification}`);
      }
    }
    const output = {durationMs: Math.round(performance.now() - started), records};
    if (config.reportDir)
      await writeFile(join(config.reportDir, 'mutation-campaign.json'), JSON.stringify(output, null, 2) + '\n');
    console.log(
      JSON.stringify({
        mutations: selected.map(m => m.id),
        controls: records.filter(r => r.context !== 'mutant').map(r => r.classification),
        detections: records.filter(r => r.context === 'mutant').map(r => r.classification),
        durationMs: output.durationMs,
      }),
    );
    return output;
  } finally {
    if (dirname(resolve(dir)) !== base || !dir.startsWith(join(base, 'gcr-property-mutants-')))
      throw Error('unsafe mutation cleanup path');
    await rm(dir, {recursive: true, force: true});
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runPropertyMutations();
