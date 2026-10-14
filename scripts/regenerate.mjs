// SPDX-License-Identifier: Apache-2.0
// Recomputes rights.json and package-manifest.json from package-policy.json and the files on disk.
// It never decides that a file is publishable: the admitted inventory, the licence rules and the
// digests of the human-readable declarations are reviewed policy, edited by hand in package-policy.json.
//
//   node scripts/regenerate.mjs --check     compare in memory, write nothing, exit 1 on drift
//   node scripts/regenerate.mjs --write     replace both registries with a recoverable two-step write
//   node scripts/regenerate.mjs --recover   restore the last consistent registries after an interrupted write
import {readdir, readFile, writeFile, rename, lstat, mkdir, rm, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, join} from 'node:path';

const STATE_DIR = '.regenerate';
const OUTPUTS = ['rights.json', 'package-manifest.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

export class RegenerateError extends Error {
  constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; }
}

function parseJson(raw, name) {
  const text = raw.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) throw new RegenerateError('invalid_json', name + ' starts with a BOM');
  try { return JSON.parse(text); } catch { throw new RegenerateError('invalid_json', name); }
}

async function walk(root, dir = '') {
  const found = [];
  for (const entry of await readdir(resolve(root, dir), {withFileTypes: true})) {
    if (!dir && (entry.name === '.git' || entry.name === 'node_modules')) continue;
    const name = dir ? dir + '/' + entry.name : entry.name;
    const stat = await lstat(resolve(root, name));
    if (stat.isSymbolicLink()) throw new RegenerateError('symlink_refused', name);
    if (stat.isDirectory()) found.push(...await walk(root, name));
    else if (stat.isFile()) found.push(name);
    else throw new RegenerateError('special_file_refused', name);
  }
  return found;
}

export function licenceFor(policy, path) {
  const rules = policy.licences;
  if (rules.reserved.includes(path)) return 'All rights reserved';
  if (Object.hasOwn(rules.licenceTexts, path)) return rules.licenceTexts[path];
  if (path.endsWith('.md')) return rules.markdown;
  if (rules.codePrefixes.some(prefix => path.startsWith(prefix)) || rules.codeFiles.includes(path)) return 'Apache-2.0';
  return rules.default;
}

export async function compute(root) {
  const policy = parseJson(await readFile(resolve(root, 'package-policy.json')), 'package-policy.json');
  if (policy.schema !== 'runtime-public-package-policy/1') throw new RegenerateError('unsupported_policy', String(policy.schema));
  let pending = null;
  try { pending = await lstat(resolve(root, STATE_DIR)); } catch {}
  if (pending) throw new RegenerateError('incomplete_previous_write', 'run --recover to restore the last consistent registries, then --write');
  const onDisk = (await walk(root)).sort();
  const inventory = [...policy.inventory].sort();
  if (new Set(inventory).size !== inventory.length) throw new RegenerateError('duplicate_inventory_entry');
  const unexpected = onDisk.filter(p => !inventory.includes(p));
  const missing = inventory.filter(p => !onDisk.includes(p));
  if (unexpected.length) throw new RegenerateError('unexpected_file', unexpected.join(', '));
  if (missing.length) throw new RegenerateError('missing_file', missing.join(', '));
  const bytes = new Map();
  for (const path of inventory) bytes.set(path, await readFile(resolve(root, path)));
  for (const [path, digest] of Object.entries(policy.declarationDigests)) {
    if (hash(bytes.get(path)) !== digest) throw new RegenerateError('policy_review_required', path + ' differs from the reviewed digest in package-policy.json');
  }
  const previousRights = parseJson(bytes.get('rights.json'), 'rights.json');
  const previousManifest = parseJson(bytes.get('package-manifest.json'), 'package-manifest.json');
  const sources = new Map((previousRights.files || []).map(row => [row.path, row.source]));
  const rights = {
    schema: 'runtime-file-rights/1',
    repositoryWideLicense: null,
    files: inventory.filter(p => !OUTPUTS.includes(p)).map(path => ({
      path, source: sources.get(path) ?? policy.defaultSource, license: licenceFor(policy, path), sha256: hash(bytes.get(path)),
    })),
    selfAndManifest: policy.selfAndManifest,
  };
  const rightsBytes = encode(rights);
  const manifest = {
    schema: previousManifest.schema,
    documentVersion: previousManifest.documentVersion,
    fictionalContextRoot: previousManifest.fictionalContextRoot,
    publicEvidencePublicationId: previousManifest.publicEvidencePublicationId,
    files: inventory.filter(p => p !== 'package-manifest.json').map(path => {
      const raw = path === 'rights.json' ? rightsBytes : bytes.get(path);
      return {path, sha256: hash(raw), bytes: raw.length};
    }),
  };
  return new Map([['rights.json', rightsBytes], ['package-manifest.json', encode(manifest)]]);
}

export async function check(root) {
  const outputs = await compute(root);
  const stale = [];
  for (const [name, raw] of outputs) if (!raw.equals(await readFile(resolve(root, name)))) stale.push(name);
  return stale;
}

export async function write(root, {faultAfterFirstRename = false} = {}) {
  const outputs = await compute(root);
  const state = resolve(root, STATE_DIR);
  await mkdir(join(state, 'backup'), {recursive: true});
  for (const name of OUTPUTS) await copyFile(resolve(root, name), join(state, 'backup', name));
  for (const [name, raw] of outputs) await writeFile(join(state, name + '.new'), raw);
  for (const [index, name] of OUTPUTS.entries()) {
    await rename(join(state, name + '.new'), resolve(root, name));
    if (faultAfterFirstRename && index === 0) throw new RegenerateError('simulated_interruption');
  }
  await rm(state, {recursive: true});
}

export async function recover(root) {
  const state = resolve(root, STATE_DIR);
  for (const name of OUTPUTS) await copyFile(join(state, 'backup', name), resolve(root, name));
  await rm(state, {recursive: true});
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const mode = process.argv[2];
  try {
    if (mode === '--check') {
      const stale = await check(root);
      if (stale.length) { console.error('STALE: ' + stale.join(', ') + ' (run npm run regenerate after review)'); process.exit(1); }
      console.log('PASS: rights.json and package-manifest.json match package-policy.json and the files');
    } else if (mode === '--write') {
      await write(root);
      console.log('WROTE: rights.json, package-manifest.json');
    } else if (mode === '--recover') {
      await recover(root);
      console.log('RECOVERED: last consistent rights.json and package-manifest.json');
    } else {
      console.error('usage: regenerate.mjs --check | --write | --recover'); process.exit(2);
    }
  } catch (error) {
    console.error('FAIL ' + (error.code || 'error') + ': ' + error.message); process.exit(1);
  }
}
