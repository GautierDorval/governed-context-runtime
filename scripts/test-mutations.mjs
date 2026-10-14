// SPDX-License-Identifier: Apache-2.0
// Controlled mutations of the verifier paths covered by test/. Each mutant is applied to a
// temporary copy of the package, never to the files under test, and must make the named tests fail.
// A mutation whose original text is not found exactly once fails loudly instead of being skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
const verifier = 'spec/reference/verification.mjs';
const TEXT = 'test/verification-paths.test.mjs', GRAPH = 'test/graph.test.mjs';

const MUTANTS = [
  ['text: JavaScript trim instead of the Python whitespace set', ".replace(ws, '')", '.trim()', TEXT],
  ['text: U+0085 dropped from the leading set', '/^[\\u0009-\\u000d\\u001c-\\u0020\\u0085', '/^[\\u0009-\\u000d\\u001c-\\u0020', TEXT],
  ['text: only the first whitespace run trimmed', ']+$/g;', ']+$/;', TEXT],
  ['text: lone CR kept', ".replaceAll('\\r', '\\n')", '', TEXT],
  ['text: NFC removed', ".normalize('NFC'));", ');', TEXT],
  ['text: NFD instead of NFC', ".normalize('NFC'));", ".normalize('NFD'));", TEXT],
  ['text: lone surrogates accepted', "fail('text_required');\n  if (!value.isWellFormed()) fail('invalid_unicode');", "fail('text_required');", TEXT],
  ['text: non-strings accepted', "if (typeof value !== 'string') fail('text_required');", 'value = String(value);', TEXT],
  ['artifact: case-insensitive JSON extension accepted', "fail('ambiguous_artifact_extension');", '{}', TEXT],
  ['artifact: declared profile ignored', "if (profile !== undefined && profile !== expected) fail('artifact_profile');", '', TEXT],
  ['selector: leading zeros accepted', '(0|[1-9][0-9]*)', '([0-9]+)', TEXT],
  ['selector: inherited properties readable', '!Object.hasOwn(value, match[1])', '!(match[1] in value)', TEXT],
  ['selector: index upper bound off by one', 'Number(match[2]) >= value.length', 'Number(match[2]) > value.length', TEXT],
  ['selector: index on a non-array accepted', "if (!Array.isArray(value) || Number(match[2])", "if (Number(match[2])", TEXT],
  ['selector: arrays addressed by key', '|| Array.isArray(value) || typeof value', '|| typeof value', TEXT],
  ['graph: duplicate identifiers accepted', "if (!semanticId || graph.has(id)) fail('duplicate_graph_id');", "if (!semanticId) fail('duplicate_graph_id');", GRAPH],
  ['graph: missing identifier accepted', "if (!semanticId || graph.has(id)) fail('duplicate_graph_id');", "if (graph.has(id)) fail('duplicate_graph_id');", GRAPH],
  ['graph: rule source not resolved', "node.ruleSourcePath = 'public' + item.sourceArtifact; source(node.ruleSourcePath);", "node.ruleSourcePath = 'public' + item.sourceArtifact;", GRAPH],
  ['graph: chain dependency dropped', "if (field === 'applicabilityChains') node.dependencies.push", "if (false) node.dependencies.push", GRAPH],
  ['graph: dangling dependency accepted', "if (!graph.has(dependency)) fail('missing_graph_dependency');", '', GRAPH],
  ['graph: coverage compared as a set', "same('graph-coverage', [...graph.values()], inventory.graph);",
    "same('graph-coverage', [...graph.values()].sort((a, b) => a.id < b.id ? -1 : 1), [...inventory.graph].sort((a, b) => a.id < b.id ? -1 : 1));", GRAPH],
  ['graph: selector index shifted', 'selector: `$.${field}[${i}]`', 'selector: `$.${field}[${i + 1}]`', GRAPH],
];

function run(dir, file) {
  const env = {...process.env};
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, ['--test', file], {cwd: dir, env, encoding: 'utf8'});
}

test('every controlled mutation of the covered verifier paths is detected', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gcr-mutations-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await cp(source, dir, {recursive: true, filter: path => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.slice(source.length - 1))});
  const original = await readFile(join(dir, verifier), 'utf8');
  // Controls: the unmodified copy and an equivalent rewrite must both pass, so a detection below
  // cannot come from the copy or the rewrite itself.
  for (const file of [TEXT, GRAPH]) assert.equal(run(dir, file).status, 0, 'baseline must pass: ' + file);
  await writeFile(join(dir, verifier), original + '\n// equivalent rewrite\n');
  for (const file of [TEXT, GRAPH]) assert.equal(run(dir, file).status, 0, 'equivalent rewrite must pass: ' + file);
  const survivors = [], broken = [];
  for (const [name, from, to, file] of MUTANTS) {
    assert.equal(original.split(from).length, 2, 'mutation target must occur exactly once: ' + name);
    await writeFile(join(dir, verifier), original.replace(from, () => to));
    const result = run(dir, file);
    if (result.status === 0) survivors.push(name);
    else if (/SyntaxError|ReferenceError/.test(result.stdout + result.stderr)) broken.push(name);
  }
  await writeFile(join(dir, verifier), original);
  assert.deepEqual(survivors, [], 'surviving mutants');
  assert.deepEqual(broken, [], 'mutants must stay valid code, so that detection is behavioural');
  t.diagnostic(`${MUTANTS.length} mutants detected`);
});
