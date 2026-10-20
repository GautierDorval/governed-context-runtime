// SPDX-License-Identifier: Apache-2.0
// Offline qualification: reuse the reference verifier; never retrieve a URI.
import {readFile, writeFile, realpath} from 'node:fs/promises';
import {resolve, dirname, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {strictParse, canonical, digest, verifySnapshot, fail} from '../spec/reference/verification.mjs';
import {inspectVerifiedPack} from '../spec/examples/verified-pack.mjs';
import {extractMcpArtifact} from '../spec/examples/read-mcp-response.mjs';
/** @import {PackSelection} from '../spec/examples/verified-pack.mjs' */

/** @param {Uint8Array} bytes */
export const byteIdentity = bytes => ({bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
/** @typedef {{intentToken: string, lang: string, version: string}} Selection */
/**
 * All returned identities describe the bytes actually read, including on refusal.
 * Input/IO absence is not a verifier rejection; unexpected exceptions are errors.
 * @param {{snapshotBytes: Uint8Array, expectedRoot: string, selections: Selection[],
 * getArchive: PackSelection['getArchive'], expectedIntents?: unknown}} input
 */
export async function qualifyOffline(input) {
  const report = {
    status: 'ERROR',
    reason: /** @type {string | null} */ (null),
    expectedRoot: input.expectedRoot,
    snapshot: byteIdentity(input.snapshotBytes),
    independentlySuppliedCatalog: input.expectedIntents !== undefined,
    archiveReads: /** @type {{uri: string, bytes: number, sha256: string}[]} */ ([]),
    inventoryItems: 0,
    snapshotChecks: 0,
    selections: /** @type {Record<string, unknown>[]} */ ([]),
    integrityOnly: true,
    signatureTrust: 'not-established',
    usePermission: 'not-evaluated',
    modelUseObserved: false,
    hostedObservationRepeated: false,
  };
  try {
    if (!/^sha-256:[a-f0-9]{64}$/.test(input.expectedRoot)) fail('pinned_root_required');
    const snapshot = strictParse(input.snapshotBytes);
    if (
      !snapshot ||
      typeof snapshot !== 'object' ||
      !('corpusRootDigest' in snapshot) ||
      snapshot.corpusRootDigest !== input.expectedRoot
    )
      fail('unexpected_corpus_root');
    if (!Array.isArray(input.selections) || !input.selections.length) fail('exact_selection_required');
    const identities = new Set();
    for (const selection of input.selections) {
      if (
        !selection ||
        !['intentToken', 'lang', 'version'].every(
          key =>
            typeof selection[/** @type {keyof Selection} */ (key)] === 'string' &&
            selection[/** @type {keyof Selection} */ (key)],
        )
      )
        fail('exact_selection_required');
      const id = JSON.stringify([selection.intentToken, selection.lang, selection.version]);
      if (identities.has(id)) fail('duplicate_selection');
      identities.add(id);
    }
    const archives = new Map();
    const checks = await verifySnapshot(
      snapshot,
      async uri => {
        const bytes = new Uint8Array(await input.getArchive(uri));
        archives.set(uri, bytes);
        report.archiveReads.push({uri, ...byteIdentity(bytes)});
        return bytes;
      },
      input.expectedIntents,
    );
    // The complete verifier above established this inventory shape.
    report.inventoryItems = /** @type {{corpusRootDigest: unknown, inventory: {items: unknown[]}}} */ (
      snapshot
    ).inventory.items.length;
    report.snapshotChecks = checks.length;
    for (const selection of input.selections) {
      const inspected = await inspectVerifiedPack({
        snapshotBytes: input.snapshotBytes,
        expectedRoot: input.expectedRoot,
        ...selection,
        expectedIntents: input.expectedIntents,
        getArchive: uri => {
          if (!archives.has(uri)) fail('archive_missing');
          return archives.get(uri);
        },
      });
      report.selections.push({
        ...selection,
        packId: inspected.pack.packId,
        payloadDigest: inspected.manifest.payloadDigest,
        payloadFileDigest: inspected.manifest.payloadFileDigest,
        verification: inspected.verification,
      });
    }
    report.status = 'PASS';
  } catch (error) {
    if (error instanceof Error && error.name === 'VerificationError') {
      report.status = 'FAIL';
      report.reason = error.message;
    } else if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      report.status = 'NOT_RUN';
      report.reason = 'input_missing';
    } else {
      report.status = 'ERROR';
      report.reason = error instanceof Error ? error.message : 'unexpected_exception';
    }
  }
  return report;
}

/**
 * Bind extracted bytes to the exact selected entry of a fully verified snapshot.
 * Matching a digest declared in the transport envelope alone is insufficient.
 * @param {Parameters<typeof extractMcpArtifact>[0]} reply
 * @param {PackSelection & {artifactByteProfile?: 'repository-bytes' | 'canonical-json'}} input
 */
export async function bindMcpPack(reply, input) {
  const extracted = extractMcpArtifact(reply);
  if (extracted.status !== 'artifact' || !extracted.artifactBytes || !extracted.envelope)
    fail('mcp_' + extracted.status);
  const bytes = extracted.artifactBytes;
  if ((await digest(bytes)) !== extracted.envelope.artifactDigest) fail('artifact_digest_mismatch');
  if (extracted.envelope.corpusRootDigest !== input.expectedRoot) fail('transport_root_mismatch');
  const inspected = await inspectVerifiedPack(input);
  const profile = input.artifactByteProfile ?? 'repository-bytes';
  if (!['repository-bytes', 'canonical-json'].includes(profile)) fail('unsupported_pack_byte_profile');
  const fileBytesBound = (await digest(bytes)) === inspected.manifest.payloadFileDigest;
  const canonicalBytes = canonical(strictParse(bytes));
  if ((await digest(canonicalBytes)) !== inspected.manifest.payloadDigest) fail('selected_pack_content_mismatch');
  if (profile === 'repository-bytes' && !fileBytesBound) fail('selected_pack_file_mismatch');
  // Canonical serving is an explicit caller-selected contract, never fallback.
  // Compare original bytes to canonical bytes: whitespace is not normalized away.
  if (profile === 'canonical-json' && !Buffer.from(bytes).equals(Buffer.from(canonicalBytes)))
    fail('noncanonical_served_pack');
  return {
    status: 'PASS',
    artifact: byteIdentity(bytes),
    artifactByteProfile: profile,
    fileBytesBound,
    canonicalContentBound: true,
    verification: inspected.verification,
  };
}

const root = fileURLToPath(new URL('../', import.meta.url));
/** @param {string} parent @param {string} child */
const inside = (parent, child) => {
  const part = relative(parent, child);
  return part === '' || (!part.startsWith('..') && !isAbsolute(part));
};

/** @param {string[]} args */
async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log(
      'node scripts/qualify-offline.mjs <config.json> <new-report.json>\n' +
        'Config: snapshotPath, archivesDirectory, expectedRoot, rootProvenance, selections [{intentToken,lang,version}], optional expectedIntentsPath (JSON array). Paths relative to config.\n' +
        'Report must be outside the package and must not exist. No network. Exit: PASS 0, FAIL 2, missing/unusable input 3, harness/environment error 4.',
    );
    return;
  }
  if (args.length !== 2) {
    console.error('Use --help');
    process.exitCode = 3;
    return;
  }
  let report;
  try {
    const configPath = resolve(args[0]);
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    if (
      !config ||
      typeof config.snapshotPath !== 'string' ||
      typeof config.archivesDirectory !== 'string' ||
      typeof config.expectedRoot !== 'string' ||
      typeof config.rootProvenance !== 'string' ||
      !config.rootProvenance.trim() ||
      !Array.isArray(config.selections) ||
      (config.expectedIntentsPath !== undefined && typeof config.expectedIntentsPath !== 'string')
    ) {
      console.error('NOT_RUN: invalid_config');
      process.exitCode = 3;
      return;
    }
    const snapshotPath = resolve(dirname(configPath), config.snapshotPath);
    const archiveDirectory = resolve(dirname(configPath), config.archivesDirectory);
    const expectedIntents =
      config.expectedIntentsPath === undefined
        ? undefined
        : JSON.parse(await readFile(resolve(dirname(configPath), config.expectedIntentsPath), 'utf8'));
    if (expectedIntents !== undefined && !Array.isArray(expectedIntents)) {
      console.error('NOT_RUN: expected_intents_must_be_array');
      process.exitCode = 3;
      return;
    }
    report = await qualifyOffline({
      snapshotBytes: await readFile(snapshotPath),
      expectedRoot: config.expectedRoot,
      expectedIntents,
      selections: config.selections,
      getArchive: uri => {
        if (!/^\/v0\/artifacts\/[a-f0-9]{64}$/.test(uri)) fail('archive_path_refused');
        return readFile(resolve(archiveDirectory, uri.split('/').at(-1) + '.json'));
      },
    });
    Object.assign(report, {
      rootProvenance: config.rootProvenance,
      config: byteIdentity(await readFile(configPath)),
      verifier: byteIdentity(await readFile(new URL('../spec/reference/verification.mjs', import.meta.url))),
      node: process.versions.node,
    });
  } catch (error) {
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    const invalid = error instanceof SyntaxError;
    report = {
      status: missing || invalid ? 'NOT_RUN' : 'ERROR',
      reason: missing ? 'input_missing' : invalid ? 'invalid_config_json' : 'input_read_error',
    };
  }
  try {
    const parent = await realpath(dirname(resolve(args[1])));
    if (inside(await realpath(root), parent)) throw Error('report_must_be_outside_package');
    await writeFile(resolve(args[1]), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  } catch (error) {
    console.error('ERROR: report_not_written: ' + (error instanceof Error ? error.message : 'unknown'));
    process.exitCode = 4;
    return;
  }
  console.log(JSON.stringify({status: report.status, reason: report.reason}));
  process.exitCode = {PASS: 0, FAIL: 2, NOT_RUN: 3, ERROR: 4}[report.status] ?? 4;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
