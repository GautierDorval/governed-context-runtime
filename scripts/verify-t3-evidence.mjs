// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const fields = [
  'activationConditions',
  'nonApplicabilityConditions',
  'requiredEvidence',
  'forbiddenInferences',
  'applicabilityAbuseBoundaries',
];
const cardinalities = [2, 2, 2, 3, 2];
const finalBoundary = 'Preuves manquantes ou contradictoires';
const repository = new URL('../', import.meta.url);
const dossier = new URL('evidence/mcp-apps-t3-2026-10-27/', repository);
/** @param {Uint8Array} bytes */
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
/** @param {Uint8Array} bytes @param {{bytes:number,sha256:string}} expected */
export function checkBytes(bytes, expected) {
  assert.equal(bytes.length, expected.bytes, 'raw byte length mismatch');
  assert.equal(sha256(bytes), expected.sha256, 'raw SHA-256 mismatch');
}

/** Derive the oracle from the pinned fixture, never from the answer.
 * @param {Uint8Array} bytes @param {string} packId @param {string} chainId
 */
export function deriveLists(bytes, packId, chainId) {
  const bundle = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  const packs = bundle.snapshot.inventory.packs.filter((/** @type {{packId:string}} */ p) => p.packId === packId);
  assert.equal(packs.length, 1, 'one selected pack required');
  const items = bundle.snapshot.inventory.items.filter(
    (/** @type {{sourcePath:string}} */ p) => p.sourcePath === packs[0].payloadSourcePath,
  );
  assert.equal(items.length, 1, 'one archived pack required');
  const archive = JSON.parse(Buffer.from(bundle.archives[items[0].uri], 'base64').toString('utf8'));
  const pack = JSON.parse(Buffer.from(archive.contentBase64, 'base64').toString('utf8'));
  assert.equal(pack.packId, packId);
  const chains = pack.applicabilityChains.filter((/** @type {{id:string}} */ c) => c.id === chainId);
  assert.equal(chains.length, 1, 'one applicability chain required');
  return fields.map((field, index) => {
    const values = chains[0][field];
    assert.ok(Array.isArray(values) && values.every(v => typeof v === 'string'));
    assert.equal(values.length, cardinalities[index]);
    return {field, values: /** @type {string[]} */ (values)};
  });
}

/** Only CRLF/LF line splitting and empty separator lines are normalized.
 * No trimming, case folding, Unicode or punctuation normalization is applied to entries.
 * @param {string} answer @param {{field:string,values:string[]}[]} expected
 */
export function compareLists(answer, expected) {
  assert.deepEqual(
    expected.map(x => x.field),
    fields,
    'expected five named lists',
  );
  const lines = answer.split(/\r?\n/);
  const boundaries = [...fields, finalBoundary].map(label => {
    const positions = lines.flatMap((line, index) => (line === label ? [index] : []));
    assert.equal(positions.length, 1, 'one exact heading required: ' + label);
    return positions[0];
  });
  assert.ok(
    boundaries.every((n, i) => i === 0 || n > boundaries[i - 1]),
    'list headings out of order',
  );
  return expected.map(({field, values}, index) => {
    const block = lines.slice(boundaries[index] + 1, boundaries[index + 1]).filter(line => line !== '');
    assert.ok(
      block.every(line => line.startsWith('• ')),
      'unexpected line inside list: ' + field,
    );
    const actual = block.map(line => line.slice(2));
    assert.equal(actual.length, cardinalities[index], 'list cardinality mismatch: ' + field);
    assert.deepEqual(actual, values, 'list content or order mismatch: ' + field);
    return {field, cardinality: actual.length, contentAndOrderExact: true, noMissingAddedOrDuplicateEntries: true};
  });
}

/** Public files only. Private transport, historical execution and manual review are not replayed. */
export async function verifyT3Evidence() {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', dossier), 'utf8'));
  assert.equal(manifest.kind, 'retained-mcp-apps-t3-evidence');
  assert.deepEqual(manifest.publicFiles.map((/** @type {{path:string}} */ file) => file.path).sort(), [
    'README.md',
    'answer.txt',
    'editorial-review.json',
    'expected-lists.json',
    'request.txt',
    'validation.json',
  ]);
  assert.deepEqual(manifest.pinnedInputs.map((/** @type {{path:string}} */ file) => file.path).sort(), [
    'spec/examples/semantic-boundaries/bundle.json',
    'spec/examples/semantic-boundaries/expected-root.json',
  ]);
  for (const file of manifest.publicFiles) {
    assert.match(file.path, /^[a-z0-9-]+\.(json|txt|md)$/i);
    assert.notEqual(file.path, 'manifest.json', 'no self-referential digest');
    checkBytes(await readFile(new URL(file.path, dossier)), file);
  }
  for (const file of manifest.pinnedInputs) {
    assert.ok(
      [
        'spec/examples/semantic-boundaries/bundle.json',
        'spec/examples/semantic-boundaries/expected-root.json',
      ].includes(file.path),
    );
    checkBytes(await readFile(new URL(file.path, repository)), file);
  }
  assert.equal(manifest.verifier.path, 'scripts/verify-t3-evidence.mjs');
  checkBytes(await readFile(new URL(manifest.verifier.path, repository)), manifest.verifier);
  const bundleBytes = await readFile(new URL('spec/examples/semantic-boundaries/bundle.json', repository));
  const bundle = JSON.parse(bundleBytes.toString('utf8'));
  const anchor = JSON.parse(
    await readFile(new URL('spec/examples/semantic-boundaries/expected-root.json', repository), 'utf8'),
  );
  assert.equal(bundle.snapshot.corpusRootDigest, manifest.selection.expectedRoot);
  assert.equal(anchor.expectedRoot, manifest.selection.expectedRoot);
  const expected = deriveLists(bundleBytes, manifest.packId, manifest.chainId);
  const criteria = JSON.parse(await readFile(new URL('expected-lists.json', dossier), 'utf8'));
  assert.deepEqual(criteria.lists, expected, 'published criteria differ from pinned fixture');
  const answer = new TextDecoder('utf-8', {fatal: true}).decode(await readFile(new URL('answer.txt', dossier)));
  const lists = compareLists(answer, expected);
  const comparison = {
    status: 'PASS_PUBLIC_ARTIFACT_COMPARISON',
    listCount: lists.length,
    itemCount: lists.reduce((sum, x) => sum + x.cardinality, 0),
    lists,
    scope: 'Exact contents, order and cardinalities of the five delimited lists in the retained final answer only.',
  };
  const recorded = JSON.parse(await readFile(new URL('validation.json', dossier), 'utf8'));
  assert.deepEqual(recorded.publicComparison, comparison, 'recorded public comparison is stale');
  return {
    ...comparison,
    rawDigestsChecked: manifest.publicFiles.length + manifest.pinnedInputs.length + 1,
    criteriaDerivedFromPinnedFixture: true,
    historicalClientReplayed: false,
    privateTransportReproduced: false,
    manualEditorialReviewReproduced: false,
    modelCalls: 0,
    networkCalls: 0,
    limits:
      'Byte correspondence is not independent authentication of the historical event. The no-addition/no-omission result covers these lists, not the whole answer. Private producer checks and manual interpretations remain separately attributed.',
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyT3Evidence(), null, 2));
  } catch (error) {
    console.error('FAIL_PUBLIC_ARTIFACT_COMPARISON:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
