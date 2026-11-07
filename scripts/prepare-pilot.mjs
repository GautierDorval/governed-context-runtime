// SPDX-License-Identifier: Apache-2.0
// Offline preparation only. It never uploads, reads credentials or calls a provider.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname, isAbsolute, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {
  loadCampaign,
  PILOT_PRICING,
  writeCampaignRecord,
} from '../spec/examples/semantic-boundaries/pilot-campaign.mjs';
import {parseProviderJson} from '../spec/examples/semantic-boundaries/pilot-json.mjs';

const args = process.argv.slice(2);
const names = [
  '--campaign',
  '--preflight',
  '--token-measurements',
  '--bundle',
  '--source-commit',
  '--admit-before',
  '--expires',
  '--pricing-verified',
  '--authorization',
  '--output',
];
if (args.length !== names.length * 2 || names.some(name => args.filter(value => value === name).length !== 1))
  throw new Error('Expected exactly: ' + names.join(' VALUE '));
/** @type {Record<string,string>} */ const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!names.includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid argument');
  options[args[i]] = args[i + 1];
}
const campaignId = options['--campaign'];
if (!/^[a-z0-9-]{1,80}$/.test(campaignId) || !/^[a-f0-9]{40}$/.test(options['--source-commit']))
  throw new Error('Invalid identity');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(options['--output']);
const rel = relative(root, output);
if (!rel.startsWith('..') && !isAbsolute(rel)) throw new Error('Private output must be outside the public package');
const hash = (/** @type {Uint8Array} */ bytes) => createHash('sha256').update(bytes).digest('hex');
const prefix = `campaigns/${campaignId}/`;
/** @type {Map<string,string>} */ const objects = new Map();
const bucket = {
  async get(/** @type {string} */ key) {
    const text = objects.get(key);
    if (text === undefined) return null;
    const bytes = new TextEncoder().encode(text);
    return {etag: 'offline', size: bytes.length, text: async () => text, arrayBuffer: async () => bytes.buffer};
  },
  async put(/** @type {string} */ key, /** @type {string} */ text) {
    if (objects.has(key)) return null;
    objects.set(key, text);
    return {etag: 'offline'};
  },
};
/** @type {Record<string,{sha256:string;bytes:number}>} */ const inputs = {};
for (const name of [
  'experiment-plan.json',
  'scenarios.json',
  'judging-rubric.json',
  ...['fr', 'en'].flatMap(lang =>
    ['pack.json', 'canonical-text.md', 'canonical-prose.md'].map(suffix => lang + '.' + suffix),
  ),
]) {
  const bytes = await readFile(resolve(root, 'spec/examples/semantic-boundaries', name));
  inputs[name] = {sha256: hash(bytes), bytes: bytes.length};
  objects.set(prefix + 'inputs/' + name, new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes));
}
const preflight = parseProviderJson(await readFile(options['--preflight'], 'utf8'));
const savedPreflight = await writeCampaignRecord(bucket, prefix + 'preflight.json', preflight);
const tokenMeasurements = parseProviderJson(await readFile(options['--token-measurements'], 'utf8'));
const savedMeasurements = await writeCampaignRecord(bucket, prefix + 'token-measurements.json', tokenMeasurements);
const manifest = {
  schema: 'runtime-provider-pilot/1',
  campaignId,
  mode: 'provider',
  sourceCommit: options['--source-commit'],
  workerBundleSha256: hash(await readFile(options['--bundle'])),
  budgetCapMicrousd: 50_000_000,
  maximumAttempts: 3366,
  admitBefore: options['--admit-before'],
  expiresAt: options['--expires'],
  pricingVerifiedAt: options['--pricing-verified'],
  ownerAuthorization: options['--authorization'],
  respondent: 'anthropic',
  reviewers: ['deepinfra', 'mistral'],
  pricing: PILOT_PRICING,
  inputs,
  preflightSha256: savedPreflight.sha256,
  tokenMeasurementsSha256: savedMeasurements.sha256,
};
const saved = await writeCampaignRecord(bucket, prefix + 'manifest.json', manifest);
await loadCampaign({bucket, campaignId, manifestSha256: saved.sha256});
// Creation is exclusive: a prepared or partly prepared packet is never overwritten.
await mkdir(output);
for (const [key, text] of objects) {
  const path = resolve(output, key);
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, text, {flag: 'wx'});
}
console.log(
  JSON.stringify({campaignId, manifestSha256: saved.sha256, output, objects: objects.size, status: 'PREPARED_NOT_RUN'}),
);
