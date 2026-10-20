// SPDX-License-Identifier: Apache-2.0
// A teaching invocation of the shared full-pack consumer. No model and no network.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonical} from '../../reference/verification.mjs';
import {inspectVerifiedPack} from '../verified-pack.mjs';

export async function loadSemanticExample() {
  const [bundle, anchor, scenarios] = await Promise.all(
    ['bundle.json', 'expected-root.json', 'scenarios.json'].map(async name =>
      JSON.parse(await readFile(new URL('./' + name, import.meta.url), 'utf8'))),
  );
  return {bundle, anchor, scenarios};
}

/** @param {string} [lang] */
export async function runSemanticDemo(lang = 'fr') {
  const {bundle, anchor, scenarios} = await loadSemanticExample();
  const inspected = await inspectVerifiedPack({
    snapshotBytes: canonical(bundle.snapshot), expectedRoot: anchor.expectedRoot,
    expectedIntents: bundle.expectedIntents,
    intentToken: 'representation-gap', lang, version: 'semantic-boundaries-1',
    /** @param {string} uri */
    getArchive: uri => {
      if (!/^\/v0\/artifacts\/[a-f0-9]{64}$/.test(uri) || !Object.hasOwn(bundle.archives, uri)) throw Error('semantic_archive_missing');
      return Buffer.from(bundle.archives[uri], 'base64');
    },
  });
  return {
    status: 'VERIFIED_FICTIONAL_SEMANTIC_CONTEXT', fictional: true,
    modelExperiment: 'NOT_RUN', modelUseObserved: false,
    verification: inspected.verification,
    pack: inspected.pack, manifest: inspected.manifest, units: inspected.units,
    sourceReferences: inspected.sources.map(source => ({sourcePath: source.sourcePath, repositoryDigest: source.repositoryDigest})),
    pedagogicalScenarios: scenarios.cases.map((/** @type {any} */ item) => ({id: item.id, classification: item.classification, question: item[lang].question, illustrativeAnswer: item[lang].illustrativeAnswer})),
    limit: 'The illustrative answers were authored for teaching. No model output is evaluated and no action is authorized.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 3) throw Error('usage: node spec/examples/semantic-boundaries/demo.mjs [fr|en]');
    console.log(JSON.stringify(await runSemanticDemo(process.argv[2] ?? 'fr'), null, 2));
  } catch (error) {
    console.error(JSON.stringify({status: 'REJECTED', reason: error instanceof Error ? error.message : String(error)}));
    process.exitCode = 2;
  }
}
