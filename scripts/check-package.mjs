// SPDX-License-Identifier: Apache-2.0
// Read-only package consistency check. It never regenerates or fixes a file; it checks the
// published state against package-policy.json and against rules kept independent of the
// generator (scripts/regenerate.mjs). It checks package consistency, not publisher identity.
import {readdir, readFile, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, relative} from 'node:path';
import assert from 'node:assert/strict';
import {strictParse} from '../spec/reference/verification.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const exact = (value, fields) => assert.deepEqual(Object.keys(value).sort(), fields.split(',').sort());
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Official licence texts: constants independent of the editable policy.
const APACHE_2_0_SHA256 = 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30';
const CC_BY_4_0_SHA256 = '9e5f1b3c610b9c2da5c313bf81d577a7d1acec686bdb0384edefa6df0f90cd94';
const SPDX_EXPRESSION = 'Apache-2.0 AND CC-BY-4.0';
const REQUIRED_PATHS = ['package-policy.json', 'rights.json', 'package-manifest.json', 'scripts/check-package.mjs', 'scripts/regenerate.mjs', 'LICENSE', 'LICENSES/CC-BY-4.0.txt', 'NOTICE.md'];

async function walk(dir = '') {
  const out = [];
  for (const entry of await readdir(resolve(root, dir), {withFileTypes: true})) {
    // Only the root .git directory and locally installed development dependencies are outside the package.
    if (!dir && (entry.name === '.git' || entry.name === 'node_modules')) continue;
    const name = [dir, entry.name].filter(Boolean).join('/');
    const stat = await lstat(resolve(root, name));
    assert(!stat.isSymbolicLink(), 'symlink forbidden: ' + name);
    if (stat.isDirectory()) out.push(...await walk(name));
    else { assert(stat.isFile(), 'non-file: ' + name); out.push(name); }
  }
  return out;
}

const policy = strictParse(await readFile(resolve(root, 'package-policy.json')));
exact(policy, 'schema,inventory,licences,declarationDigests,defaultSource,selfAndManifest,spdx');
assert.equal(policy.schema, 'runtime-public-package-policy/1');
exact(policy.licences, 'reserved,licenceTexts,codePrefixes,codeFiles,markdown,default');
const expected = [...policy.inventory].sort();
assert.equal(new Set(expected).size, expected.length, 'duplicate inventory entry');
for (const path of REQUIRED_PATHS) assert(expected.includes(path), 'required path missing from policy: ' + path);
assert.deepEqual((await walk()).sort(), expected, 'unexpected or missing file');

// Independent licence evaluator; it must agree with rights.json for every file.
const licences = policy.licences;
const licenceFor = path =>
  licences.reserved.includes(path) ? 'All rights reserved'
    : Object.hasOwn(licences.licenceTexts, path) ? licences.licenceTexts[path]
      : path.endsWith('.md') ? licences.markdown
        : licences.codePrefixes.some(prefix => path.startsWith(prefix)) || licences.codeFiles.includes(path) ? 'Apache-2.0'
          : licences.default;
assert.deepEqual(licences.codePrefixes, ['spec/', 'scripts/', '.github/']);
assert.equal(licences.markdown, 'CC-BY-4.0');
assert.equal(licences.default, 'CC-BY-4.0');
assert.deepEqual(Object.entries(licences.licenceTexts), [['LICENSES/CC-BY-4.0.txt', 'CC-BY-4.0']]);
for (const path of licences.reserved) assert(expected.includes(path), 'reserved path outside the inventory: ' + path);

const manifest = strictParse(await readFile(resolve(root, 'package-manifest.json')));
exact(manifest, 'schema,documentVersion,fictionalContextRoot,publicEvidencePublicationId,files');
assert.equal(manifest.schema, 'runtime-public-package/0.2.0-proposed');
assert.equal(manifest.documentVersion, '0.2.0-proposed');
assert.deepEqual(manifest.files.map(item => item.path).sort(), expected.filter(path => path !== 'package-manifest.json'));
const bytes = new Map();
for (const item of manifest.files) {
  exact(item, 'path,sha256,bytes'); assert(expected.includes(item.path));
  assert.equal(relative(root, resolve(root, item.path)).replaceAll('\\', '/'), item.path);
  const raw = await readFile(resolve(root, item.path)); bytes.set(item.path, raw);
  assert.equal(raw.length, item.bytes, 'length:' + item.path); assert.equal(hash(raw), item.sha256, 'digest:' + item.path);
  if (item.path.endsWith('.json')) strictParse(raw);
  if (item.path.endsWith('.svg')) {
    const svg = raw.toString();
    assert(!/<script|<foreignObject|<!ENTITY|<!DOCTYPE|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(/i.test(svg), 'active SVG');
  }
}

const rights = strictParse(bytes.get('rights.json'));
exact(rights, 'schema,repositoryWideLicense,files,selfAndManifest');
assert.equal(rights.schema, 'runtime-file-rights/1'); assert.equal(rights.repositoryWideLicense, null);
assert.deepEqual(rights.files.map(row => row.path).sort(), expected.filter(path => !['rights.json', 'package-manifest.json'].includes(path)));
for (const row of rights.files) {
  exact(row, 'path,source,license,sha256');
  assert.equal(row.sha256, hash(bytes.get(row.path))); assert.equal(row.license, licenceFor(row.path), 'licence: ' + row.path);
}
assert.equal(rights.selfAndManifest, policy.selfAndManifest);
assert.equal(licenceFor('rights.json'), 'Apache-2.0'); assert.equal(licenceFor('package-manifest.json'), 'Apache-2.0'); assert.equal(licenceFor('package-policy.json'), 'Apache-2.0');
assert.equal(rights.selfAndManifest, 'rights.json and package-manifest.json are project metadata under ' + licenceFor('rights.json'));

// Declarations: official texts are pinned here; reviewed declarations are pinned in the policy.
assert.deepEqual(bytes.get('LICENSE'), bytes.get('spec/LICENSE'));
assert.equal(hash(bytes.get('LICENSE')), APACHE_2_0_SHA256, 'official Apache-2.0 text, verbatim');
assert.equal(hash(bytes.get('LICENSES/CC-BY-4.0.txt')), CC_BY_4_0_SHA256, 'official CC BY 4.0 legal code, trailing blank line trimmed');
assert.equal(policy.declarationDigests.LICENSE, APACHE_2_0_SHA256);
assert.equal(policy.declarationDigests['LICENSES/CC-BY-4.0.txt'], CC_BY_4_0_SHA256);
for (const [path, digest] of Object.entries(policy.declarationDigests)) assert.equal(hash(bytes.get(path)), digest, path + ' differs from the reviewed policy digest');
for (const path of ['NOTICE.md', 'CITATION.cff']) assert(Object.hasOwn(policy.declarationDigests, path), path + ' must be pinned by the policy');
assert.equal(policy.spdx, SPDX_EXPRESSION);
assert.equal(strictParse(bytes.get('package.json')).license, SPDX_EXPRESSION);
assert(!/^\s*["']?license["']?\s*:/m.test(bytes.get('CITATION.cff').toString()), 'CFF lists alternative licences; the split is declared in NOTICE.md');
{
  const notice = bytes.get('NOTICE.md').toString();
  for (const path of licences.reserved) assert(notice.includes(path), 'reserved visual missing from NOTICE: ' + path);
}

const docs = strictParse(bytes.get('docs/source.json'));
exact(docs, 'schema,documentVersion,project,author,authorUrl,repository,publicSpecRepositoryPath,en,fr');
assert.equal(docs.publicSpecRepositoryPath, 'https://github.com/GautierDorval/governed-context-runtime/tree/d57ee3bc6f3edf52019dc8fbe56a18b8f8ddcb9d/spec/');
const fields = 'title,definition,instance,status,intent,retrieval,localDecision,counterexample,evidence,limits,unitBoundary,historicalBoundary,architectureCaption,verificationCaption,lead,useCase,benefits';
assert.equal(docs.schema, 'runtime-public-documentation/0.2.0-proposed');
exact(docs.en, fields); exact(docs.fr, fields);
assert(!docs.en.limits.includes('authenticates its projected content'));
assert(docs.en.limits.includes('does not authenticate the source'));
assert(docs.fr.limits.includes('n’authentifie pas sa source'));
const fixture = strictParse(bytes.get('spec/examples/synthetic/bundle.json'));
exact(fixture, 'schema,fictional,provenance,expectedRoot,expectedIntents,snapshot,archives,policy,receipt');
assert.equal(fixture.fictional, true); assert.equal(fixture.expectedRoot, manifest.fictionalContextRoot);
assert.deepEqual(Object.keys(fixture.archives).sort(), fixture.snapshot.inventory.items.map(item => item.uri).sort());
const publication = strictParse(bytes.get('evidence/publication.json'));
assert.equal(publication.publicationId, manifest.publicEvidencePublicationId);
console.log(`PASS: ${expected.length} fixed paths, ${manifest.files.length} manifest entries, ${rights.files.length} rights entries`);
