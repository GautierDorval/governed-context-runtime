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
/** @import {FileRights, PackageManifest, PackagePolicy} from './package-types.d.mts' */

const STATE_DIR = '.regenerate';
const STAGING_DIR = '.regenerate-staging';
const OWNER_FILE = 'owner.json';
const OWNER_BYTES = Buffer.from('{"schema":"runtime-regeneration-state/1"}\n');
const OUTPUTS = ['rights.json', 'package-manifest.json'];
/** @param {Uint8Array} bytes */
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value */
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

export class RegenerateError extends Error {
  /** @param {string} code @param {string} [detail] */
  constructor(code, detail) {
    super(code + (detail ? ': ' + detail : ''));
    this.code = code;
  }
}

/**
 * Parses a registry or policy file; the shape is checked by the callers and by check-package.mjs.
 * @template T
 * @param {Buffer} raw
 * @param {string} name
 * @returns {T}
 */
function parseJson(raw, name) {
  const text = raw.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) throw new RegenerateError('invalid_json', name + ' starts with a BOM');
  try {
    return JSON.parse(text);
  } catch {
    throw new RegenerateError('invalid_json', name);
  }
}

/** @param {string} root @param {string} [dir] @returns {Promise<string[]>} */
async function walk(root, dir = '') {
  /** @type {string[]} */
  const found = [];
  for (const entry of await readdir(resolve(root, dir), {withFileTypes: true})) {
    if (!dir && (entry.name === '.git' || entry.name === 'node_modules')) continue;
    const name = dir ? dir + '/' + entry.name : entry.name;
    const stat = await lstat(resolve(root, name));
    if (stat.isSymbolicLink()) throw new RegenerateError('symlink_refused', name);
    if (stat.isDirectory()) found.push(...(await walk(root, name)));
    else if (stat.isFile()) found.push(name);
    else throw new RegenerateError('special_file_refused', name);
  }
  return found;
}

/** @param {PackagePolicy} policy @param {string} path */
export function licenceFor(policy, path) {
  const rules = policy.licences;
  if (rules.reserved.includes(path)) return 'All rights reserved';
  if (Object.hasOwn(rules.licenceTexts, path)) return rules.licenceTexts[path];
  if (path.endsWith('.md')) return rules.markdown;
  if (rules.codePrefixes.some(prefix => path.startsWith(prefix)) || rules.codeFiles.includes(path)) return 'Apache-2.0';
  return rules.default;
}

/** @param {string} path */
async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

// Recovery owns only marked directories with a closed layout. Unknown state is preserved.
// This is a local ownership check, not protection against concurrent or hostile writers.
/** @param {string} directory */
async function requireOwnedState(directory) {
  const fail = () => new RegenerateError('unrecognized_recovery_state', directory);
  if (!(await lstat(directory)).isDirectory()) throw fail();
  const marker = join(directory, OWNER_FILE);
  if (!(await exists(marker)) || !(await lstat(marker)).isFile()) throw fail();
  if (!(await readFile(marker)).equals(OWNER_BYTES)) throw fail();
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const stat = await lstat(path);
    if (name === 'backup') {
      if (!stat.isDirectory()) throw fail();
      for (const backup of await readdir(path)) {
        if (!OUTPUTS.includes(backup) || !(await lstat(join(path, backup))).isFile()) throw fail();
      }
    } else if (![OWNER_FILE, ...OUTPUTS.map(output => output + '.new')].includes(name) || !stat.isFile()) {
      throw fail();
    }
  }
}

/** @param {string} root @returns {Promise<Map<string, Buffer>>} */
export async function compute(root) {
  /** @type {PackagePolicy} */
  const policy = parseJson(await readFile(resolve(root, 'package-policy.json')), 'package-policy.json');
  if (policy.schema !== 'runtime-public-package-policy/1')
    throw new RegenerateError('unsupported_policy', String(policy.schema));
  for (const directory of [STATE_DIR, STAGING_DIR]) {
    if (await exists(resolve(root, directory)))
      throw new RegenerateError(
        'incomplete_previous_write',
        'run --recover, then --write; if recovery fails, preserve the state and follow MAINTAINING.md',
      );
  }
  const onDisk = (await walk(root)).sort();
  const inventory = [...policy.inventory].sort();
  if (new Set(inventory).size !== inventory.length) throw new RegenerateError('duplicate_inventory_entry');
  const unexpected = onDisk.filter(p => !inventory.includes(p));
  const missing = inventory.filter(p => !onDisk.includes(p));
  if (unexpected.length) throw new RegenerateError('unexpected_file', unexpected.join(', '));
  if (missing.length) throw new RegenerateError('missing_file', missing.join(', '));
  /** @type {Map<string, Buffer>} */
  const bytes = new Map();
  for (const path of inventory) bytes.set(path, await readFile(resolve(root, path)));
  /** @param {string} path */
  const file = path => {
    const raw = bytes.get(path);
    if (!raw) throw new RegenerateError('policy_review_required', path + ' is not in the admitted inventory');
    return raw;
  };
  for (const [path, digest] of Object.entries(policy.declarationDigests)) {
    if (hash(file(path)) !== digest)
      throw new RegenerateError(
        'policy_review_required',
        path + ' differs from the reviewed digest in package-policy.json',
      );
  }
  /** @type {FileRights} */
  const previousRights = parseJson(file('rights.json'), 'rights.json');
  /** @type {PackageManifest} */
  const previousManifest = parseJson(file('package-manifest.json'), 'package-manifest.json');
  const sources = new Map((previousRights.files || []).map(row => [row.path, row.source]));
  const rights = {
    schema: 'runtime-file-rights/1',
    repositoryWideLicense: null,
    files: inventory
      .filter(p => !OUTPUTS.includes(p))
      .map(path => ({
        path,
        source: sources.get(path) ?? policy.defaultSource,
        license: licenceFor(policy, path),
        sha256: hash(file(path)),
      })),
    selfAndManifest: policy.selfAndManifest,
  };
  const rightsBytes = encode(rights);
  const manifest = {
    schema: previousManifest.schema,
    documentVersion: previousManifest.documentVersion,
    fictionalContextRoot: previousManifest.fictionalContextRoot,
    publicEvidencePublicationId: previousManifest.publicEvidencePublicationId,
    files: inventory
      .filter(p => p !== 'package-manifest.json')
      .map(path => {
        const raw = path === 'rights.json' ? rightsBytes : file(path);
        return {path, sha256: hash(raw), bytes: raw.length};
      }),
  };
  return new Map([
    ['rights.json', rightsBytes],
    ['package-manifest.json', encode(manifest)],
  ]);
}

/** @param {string} root @returns {Promise<string[]>} */
export async function check(root) {
  const outputs = await compute(root);
  /** @type {string[]} */
  const stale = [];
  for (const [name, raw] of outputs) if (!raw.equals(await readFile(resolve(root, name)))) stale.push(name);
  return stale;
}

/**
 * @param {string} root
 * @param {{faultAfterFirstRename?: boolean, faultAt?: 'staging-created'|'first-backup'|'staged'|'published'|'first-replacement'|'cleanup-started'}} [options]
 */
export async function write(root, {faultAfterFirstRename = false, faultAt} = {}) {
  const outputs = await compute(root);
  const state = resolve(root, STATE_DIR);
  const staging = resolve(root, STAGING_DIR);
  /** @param {string} point */
  const interrupt = point => {
    if (faultAt === point || (faultAfterFirstRename && point === 'first-replacement'))
      throw new RegenerateError('simulated_interruption');
  };
  // Only publish the recovery directory once every backup and replacement is complete.
  // Recognized unpublished staging can be discarded without touching the registries.
  await mkdir(staging);
  await writeFile(join(staging, OWNER_FILE), OWNER_BYTES, {flag: 'wx'});
  await mkdir(join(staging, 'backup'));
  interrupt('staging-created');
  for (const [index, name] of OUTPUTS.entries()) {
    await copyFile(resolve(root, name), join(staging, 'backup', name));
    if (index === 0) interrupt('first-backup');
  }
  for (const [name, raw] of outputs) await writeFile(join(staging, name + '.new'), raw);
  interrupt('staged');
  await rename(staging, state);
  interrupt('published');
  for (const [index, name] of OUTPUTS.entries()) {
    await rename(join(state, name + '.new'), resolve(root, name));
    if (index === 0) interrupt('first-replacement');
  }
  // Both registries are committed. Make interrupted cleanup disposable as well.
  await rename(state, staging);
  interrupt('cleanup-started');
  await rm(staging, {recursive: true});
}

/** @param {string} root */
export async function recover(root) {
  const state = resolve(root, STATE_DIR);
  const staging = resolve(root, STAGING_DIR);
  if (await exists(staging)) {
    if (await exists(state)) throw new RegenerateError('ambiguous_recovery_state');
    await requireOwnedState(staging);
    await rm(staging, {recursive: true});
    return;
  }
  await requireOwnedState(state);
  // Read every backup before restoring either registry. Incomplete legacy backups
  // or invalid JSON backups must not overwrite either current registry.
  const backups = await Promise.all(OUTPUTS.map(name => readFile(join(state, 'backup', name))));
  for (const [index, name] of OUTPUTS.entries()) parseJson(backups[index], 'backup/' + name);
  for (const [index, name] of OUTPUTS.entries()) await writeFile(resolve(root, name), backups[index]);
  await rename(state, staging);
  await rm(staging, {recursive: true});
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const mode = process.argv[2];
  try {
    if (mode === '--check') {
      const stale = await check(root);
      if (stale.length) {
        console.error('STALE: ' + stale.join(', ') + ' (run npm run regenerate after review)');
        process.exit(1);
      }
      console.log('PASS: rights.json and package-manifest.json match package-policy.json and the files');
    } else if (mode === '--write') {
      await write(root);
      console.log('WROTE: rights.json, package-manifest.json');
    } else if (mode === '--recover') {
      await recover(root);
      console.log('RECOVERED: last consistent rights.json and package-manifest.json');
    } else {
      console.error('usage: regenerate.mjs --check | --write | --recover');
      process.exit(2);
    }
  } catch (error) {
    const known = error instanceof RegenerateError;
    console.error(
      'FAIL ' + (known ? error.code : 'error') + ': ' + (error instanceof Error ? error.message : String(error)),
    );
    process.exit(1);
  }
}
