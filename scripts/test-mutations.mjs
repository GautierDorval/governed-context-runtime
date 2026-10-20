// SPDX-License-Identifier: Apache-2.0
// Controlled mutations of the verifier paths covered by test/. Each mutant is applied to a
// temporary copy of the package, never to the files under test, and must make the named tests fail
// on an assertion, as reported by the node:test runner's structured events (scripts/mutation-verdict.mjs).
// A mutation whose original text is not found exactly once fails loudly instead of being skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runFile, verdict} from './mutation-verdict.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));
const verifier = 'spec/reference/verification.mjs';
const TEXT = 'test/verification-paths.test.mjs',
  GRAPH = 'test/graph.test.mjs',
  ARCHIVE = 'spec/reference/test-archive-profile.mjs';

const MUTANTS = [
  ['archive: open member set', "fail('archive_fields');", '{}', ARCHIVE],
  [
    'archive: cardinality without membership',
    '|| !ARCHIVE_FIELDS.every(key => Object.hasOwn(archive, key))',
    '',
    ARCHIVE,
  ],
  [
    'archive: nonzero pad bits accepted',
    "if (btoa(decoded) !== archive.contentBase64) fail('noncanonical_base64');",
    '',
    ARCHIVE,
  ],
  [
    'archive: member guard only on the first item',
    "fail('archive_fields');",
    "if (item === inventory.items[0]) fail('archive_fields');",
    ARCHIVE,
  ],
  [
    'archive: decoded source digest before canonical base64',
    "if (btoa(decoded) !== archive.contentBase64) fail('noncanonical_base64');\n    const data = Uint8Array.from(decoded, c => c.charCodeAt(0));\n    same('source-bytes:' + item.sourcePath, item.repositoryDigest, await digest(data));",
    "const data = Uint8Array.from(decoded, c => c.charCodeAt(0));\n    same('source-bytes:' + item.sourcePath, item.repositoryDigest, await digest(data));\n    if (btoa(decoded) !== archive.contentBase64) fail('noncanonical_base64');",
    ARCHIVE,
  ],
  ['text: JavaScript trim instead of the Python whitespace set', ".replace(ws, '')", '.trim()', TEXT],
  [
    'text: U+0085 dropped from the leading set',
    '/^[\\u0009-\\u000d\\u001c-\\u0020\\u0085',
    '/^[\\u0009-\\u000d\\u001c-\\u0020',
    TEXT,
  ],
  ['text: only the first whitespace run trimmed', ']+$/g;', ']+$/;', TEXT],
  ['text: lone CR kept', ".replaceAll('\\r', '\\n')", '', TEXT],
  ['text: NFC removed', ".normalize('NFC'));", ');', TEXT],
  ['text: NFD instead of NFC', ".normalize('NFC'));", ".normalize('NFD'));", TEXT],
  [
    'text: lone surrogates accepted',
    "fail('text_required');\n  if (!value.isWellFormed()) fail('invalid_unicode');",
    "fail('text_required');",
    TEXT,
  ],
  [
    'text: non-strings accepted',
    "if (typeof value !== 'string') fail('text_required');",
    'value = String(value);',
    TEXT,
  ],
  ['artifact: case-insensitive JSON extension accepted', "fail('ambiguous_artifact_extension');", '{}', TEXT],
  [
    'artifact: declared profile ignored',
    "if (profile !== undefined && profile !== expected) fail('artifact_profile');",
    '',
    TEXT,
  ],
  ['selector: leading zeros accepted', '(0|[1-9][0-9]*)', '([0-9]+)', TEXT],
  ['selector: inherited properties readable', '!Object.hasOwn(value, match[1])', '!(match[1] in value)', TEXT],
  [
    'selector: index upper bound off by one',
    'Number(match[2]) >= value.length',
    'Number(match[2]) > value.length',
    TEXT,
  ],
  [
    'selector: index on a non-array accepted',
    'if (!Array.isArray(value) || Number(match[2])',
    'if (Number(match[2])',
    TEXT,
  ],
  ['selector: arrays addressed by key', '|| Array.isArray(value) || typeof value', '|| typeof value', TEXT],
  [
    'graph: duplicate identifiers accepted',
    "if (!semanticId || graph.has(id)) fail('duplicate_graph_id');",
    "if (!semanticId) fail('duplicate_graph_id');",
    GRAPH,
  ],
  [
    'graph: missing identifier accepted',
    "if (!semanticId || graph.has(id)) fail('duplicate_graph_id');",
    "if (graph.has(id)) fail('duplicate_graph_id');",
    GRAPH,
  ],
  [
    'graph: rule source not resolved',
    "node.ruleSourcePath = 'public' + item.sourceArtifact; source(node.ruleSourcePath);",
    "node.ruleSourcePath = 'public' + item.sourceArtifact;",
    GRAPH,
  ],
  [
    'graph: chain dependency dropped',
    "if (field === 'applicabilityChains') node.dependencies.push",
    'if (false) node.dependencies.push',
    GRAPH,
  ],
  ['graph: dangling dependency accepted', "if (!graph.has(dependency)) fail('missing_graph_dependency');", '', GRAPH],
  [
    'graph: coverage compared as a set',
    "same('graph-coverage', [...graph.values()], inventory.graph);",
    "same('graph-coverage', [...graph.values()].sort((a, b) => a.id < b.id ? -1 : 1), [...inventory.graph].sort((a, b) => a.id < b.id ? -1 : 1));",
    GRAPH,
  ],
  ['graph: selector index shifted', 'selector: `$.${field}[${i}]`', 'selector: `$.${field}[${i + 1}]`', GRAPH],
];

test('every controlled mutation of the covered verifier paths is detected', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gcr-mutations-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await cp(source, dir, {
    recursive: true,
    filter: path => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.slice(source.length - 1)),
  });
  const original = await readFile(join(dir, verifier), 'utf8');
  // Controls: the unmodified copy and an equivalent rewrite must both pass, so a detection below
  // cannot come from the copy or the rewrite itself.
  for (const file of [TEXT, GRAPH, ARCHIVE])
    assert.equal(verdict(await runFile(dir, file)), 'pass', 'baseline must pass: ' + file);
  await writeFile(join(dir, verifier), original + '\n// equivalent rewrite\n');
  for (const file of [TEXT, GRAPH, ARCHIVE])
    assert.equal(verdict(await runFile(dir, file)), 'pass', 'equivalent rewrite must pass: ' + file);
  /** @type {string[]} */
  const survivors = [];
  /** @type {string[]} */
  const broken = [];
  for (const [name, from, to, file] of MUTANTS) {
    assert.equal(original.split(from).length, 2, 'mutation target must occur exactly once: ' + name);
    await writeFile(
      join(dir, verifier),
      original.replace(from, () => to),
    );
    // Detection requires the named tests to run and fail on an assertion; a crash, a load error,
    // a signal, a timeout or a missing report is a broken mutant, never a detection.
    const outcome = verdict(await runFile(dir, file));
    if (outcome === 'pass') survivors.push(name);
    else if (outcome !== 'assertion failure') broken.push(name + ': ' + outcome);
  }
  await writeFile(join(dir, verifier), original);
  assert.deepEqual(survivors, [], 'surviving mutants');
  assert.deepEqual(broken, [], 'every detection must be an assertion failure of the named tests');
  t.diagnostic(`${MUTANTS.length} mutants detected`);
});
