// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPilotBudget} from '../spec/examples/semantic-boundaries/pilot-budget.mjs';
import {
  campaignAttemptRunner,
  runCampaign,
  loadCampaign,
  snapshotCampaignInputs,
  materializeCampaignSnapshot,
  writeCampaignRecord,
  readCampaignStatus,
  readCampaignRecord,
  readCampaignRecovery,
  admitCampaignRecovery,
  PILOT_PRICING,
  qualifyCampaignStorage,
} from '../spec/examples/semantic-boundaries/pilot-campaign.mjs';
import {PROVIDER_PROFILES} from '../spec/examples/semantic-boundaries/pilot-provider.mjs';
import {createHash} from 'node:crypto';
import {buildProviderRequest} from '../spec/examples/semantic-boundaries/pilot-provider.mjs';
import {preparePilotTrials, PilotTechnicalError} from '../spec/examples/semantic-boundaries/pilot-execution.mjs';
class Bucket {
  /** @type {Map<string,{text:string;etag:string}>} */ rows = new Map();
  version = 0;
  /** @param {string} key */
  async get(key) {
    const row = this.rows.get(key);
    return row
      ? {
          etag: row.etag,
          size: Buffer.byteLength(row.text),
          text: async () => row.text,
          arrayBuffer: async () => new TextEncoder().encode(row.text).buffer,
        }
      : null;
  }
  /** @param {string} key @param {string} text @param {{onlyIf:{etagMatches?:string;etagDoesNotMatch?:string}}} options */
  async put(key, text, options) {
    const row = this.rows.get(key);
    if (
      (options.onlyIf.etagDoesNotMatch === '*' && row) ||
      (options.onlyIf.etagMatches && options.onlyIf.etagMatches !== row?.etag)
    )
      return null;
    const next = {text, etag: String(++this.version)};
    this.rows.set(key, next);
    return {etag: next.etag};
  }
}
const now = () => new Date('2026-11-07T12:00:00.000Z');
const expiresAt = '2026-11-08T00:00:00.000Z';
const prefix = 'campaigns/synthetic/';
const request = buildProviderRequest({
  provider: 'anthropic',
  promptBytes: new TextEncoder().encode('A synthetic request.'),
  outputTokenLimit: 512,
});
const credentials = {
  anthropic: 'synthetic-credential',
  mistral: 'synthetic-credential',
  deepinfra: 'synthetic-credential',
};
/** @param {string} [rawText] */
const response = (rawText = 'OK') => ({
  rawText,
  rawBody: JSON.stringify({synthetic: rawText}),
  finishReason: 'stop',
  usage: {inputTokens: 100, outputTokens: 20},
  model: 'synthetic',
  requestSha256: 'c'.repeat(64),
  responseSha256: 'd'.repeat(64),
});
/** @param {Bucket} bucket */
const ledgerFor = bucket =>
  createPilotBudget({
    bucket,
    key: prefix + 'budget.json',
    authorization: {planSha256: 'a'.repeat(64), capMicrousd: 50_000_000, maximumAttempts: 3366, expiresAt},
    now,
  });

test('conditional storage qualification rejects ignored create-only or compare-and-swap conditions', async () => {
  for (const ignored of [null, 'etagDoesNotMatch', 'etagMatches']) {
    const bucket = new Bucket();
    const put = bucket.put.bind(bucket);
    bucket.put = (key, text, options) =>
      put(key, text, ignored && Object.hasOwn(options.onlyIf, ignored) ? {onlyIf: {}} : options);
    const options = {bucket, campaignId: 'synthetic', manifestSha256: 'a'.repeat(64)};
    if (ignored) await assert.rejects(qualifyCampaignStorage(options), /campaign_storage_/);
    else {
      const proof = await qualifyCampaignStorage(options);
      const writes = bucket.version;
      assert.deepEqual(await qualifyCampaignStorage(options), proof);
      assert.equal(bucket.version, writes);
    }
  }
});

test('an interrupted storage qualification cannot be treated as a completed qualification', async () => {
  const bucket = new Bucket();
  bucket.rows.set(prefix + 'storage-qualification.json', {
    etag: '1',
    text: '{"schema":"runtime-pilot-storage-pending/1"}',
  });
  await assert.rejects(
    qualifyCampaignStorage({bucket, campaignId: 'synthetic', manifestSha256: 'a'.repeat(64)}),
    /campaign_record_integrity/,
  );
});

test('failure to retain the budget-started marker prevents HTTP even after a reservation', async () => {
  const bucket = new Bucket();
  const put = bucket.put.bind(bucket);
  bucket.put = (key, text, options) => {
    if (key.endsWith('/budget-started.json')) throw new Error('marker unavailable');
    return put(key, text, options);
  };
  let sends = 0;
  const runner = campaignAttemptRunner({
    bucket,
    prefix,
    ledger: ledgerFor(bucket),
    credentials,
    now,
    invoke: async () => {
      sends++;
      return response();
    },
  });
  await assert.rejects(runner('respondent/trial-0001/1', request), /marker unavailable/);
  assert.equal(sends, 0);
  assert.equal((await ledgerFor(bucket).summary()).committedMicrousd, 501280);
});

test('durable attempt replay returns the original response without another send or charge', async () => {
  const bucket = new Bucket();
  let sends = 0;
  const runner = campaignAttemptRunner({
    bucket,
    prefix,
    ledger: ledgerFor(bucket),
    credentials,
    invoke: async () => {
      sends++;
      return response();
    },
    now,
  });
  const first = await runner('respondent/trial-0001/1', request);
  const replay = await runner('respondent/trial-0001/1', request);
  assert.deepEqual(JSON.parse(JSON.stringify(replay)), first);
  assert.equal(sends, 1);
  assert.equal((await ledgerFor(bucket).summary()).attempts, 1);
  assert.equal((await ledgerFor(bucket).summary()).committedMicrousd, 100);
});

test('crash after HTTP but before durable outcome keeps the full reservation and forbids replay', async () => {
  const bucket = new Bucket();
  let sends = 0;
  const put = bucket.put.bind(bucket);
  bucket.put = async (key, text, options) => {
    if (key.includes('/attempts/')) throw new Error('disk write unavailable');
    return put(key, text, options);
  };
  const runner = campaignAttemptRunner({
    bucket,
    prefix,
    ledger: ledgerFor(bucket),
    credentials,
    invoke: async () => {
      sends++;
      return response();
    },
    now,
  });
  await assert.rejects(runner('respondent/trial-0001/1', request), /disk write/);
  bucket.put = put;
  await assert.rejects(runner('respondent/trial-0001/1', request), /unresolved/);
  assert.equal(sends, 1);
  assert.equal((await ledgerFor(bucket).summary()).unresolvedAttempts, 1);
  assert((await ledgerFor(bucket).summary()).committedMicrousd > 500_000);
});

test('crash after retained outcome resumes settlement without a second HTTP request', async () => {
  const bucket = new Bucket();
  let sends = 0;
  const ledger = ledgerFor(bucket);
  const failing = {
    ...ledger,
    finish: async () => {
      throw new Error('settlement write unavailable');
    },
  };
  const invoke = async () => {
    sends++;
    return response();
  };
  await assert.rejects(
    campaignAttemptRunner({bucket, prefix, ledger: failing, credentials, invoke, now})(
      'respondent/trial-0001/1',
      request,
    ),
    /settlement/,
  );
  await campaignAttemptRunner({bucket, prefix, ledger: ledgerFor(bucket), credentials, invoke, now})(
    'respondent/trial-0001/1',
    request,
  );
  assert.equal(sends, 1);
  assert.equal((await ledgerFor(bucket).summary()).unresolvedAttempts, 0);
});

const source = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
const plan = JSON.parse(await readFile(new URL('experiment-plan.json', source), 'utf8'));
const scenarios = JSON.parse(await readFile(new URL('scenarios.json', source), 'utf8'));
const rubric = JSON.parse(await readFile(new URL('judging-rubric.json', source), 'utf8'));
/** @type {Record<string,Record<string,Uint8Array>>} */ const documentation = {};
for (const language of plan.languages) {
  documentation[language] = {};
  for (const condition of ['pack', 'exhaustive_text', 'canonical_prose'])
    documentation[language][condition] = await readFile(new URL(plan.inputs[language][condition].path, source));
}
const trials = preparePilotTrials({plan, scenarios, documentation, configurationId: 'synthetic'});
/** @type {import('../spec/examples/semantic-boundaries/pilot-campaign.mjs').Campaign} */
const campaign = {
  prefix,
  trials,
  rubric,
  manifest: {
    campaignId: 'synthetic',
    budgetCapMicrousd: 50_000_000,
    maximumAttempts: 3366,
    expiresAt,
    reviewers: ['deepinfra', 'mistral'],
  },
};
/** @param {{request: import('../spec/examples/semantic-boundaries/pilot-provider.mjs').ProviderRequest}} input */
async function invoke({request: current}) {
  if (current.role === 'preflight' && current.provider === 'anthropic') return response();
  if (current.role === 'respondent') return response('');
  const input = JSON.parse(JSON.parse(current.body).messages.at(-1).content);
  return response(
    JSON.stringify({
      dimensions: Object.entries(input.rubric.applicability).map(([dimension, applicability]) => ({
        dimension,
        applicability,
        label: applicability === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : 'UNSCORABLE',
        reason: 'The received response is empty.',
        responseExcerpt: '',
      })),
      utility: {category: 'UNDETERMINED', reason: 'The received response is empty.'},
    }),
  );
}
/** @type {{run<T>(name: string, callback: () => Promise<T>): Promise<T>}} */
const steps = {
  async run(_name, callback) {
    return callback();
  },
};

test(
  'full synthetic 560-response campaign retains 1120 judge records and never claims a native RUN',
  {timeout: 120_000},
  async () => {
    const bucket = new Bucket();
    let sends = 0;
    const result = await runCampaign({
      bucket,
      campaign,
      manifestSha256: 'a'.repeat(64),
      credentials,
      steps,
      now,
      invoke: async input => {
        sends++;
        return invoke(input);
      },
    });
    assert.equal(sends, 1683);
    assert.equal(result.status, 'SYNTHETIC_RUN');
    assert.equal(result.responses.completed, 560);
    assert.equal(result.responses.completedEmpty, 560);
    assert.equal(result.judgments.acceptedAnnotations, 1120);
    assert.equal(result.judgments.pairedResponses, 560);
    assert.equal(result.rejectedJudgments.length, 0);
    assert.equal(result.spend.attempts, 1683);
    assert(result.spend.committedMicrousd < 50_000_000);
  },
);

test('technical retry comes after the first pass and a rejected completed judgment is not retried', async () => {
  const bucket = new Bucket();
  let responses = 0,
    judgeCalls = 0;
  /** @type {number[]} */ const order = [];
  const result = await runCampaign({
    bucket,
    campaign: {...campaign, trials: trials.slice(0, 2)},
    manifestSha256: 'a'.repeat(64),
    credentials,
    steps,
    now,
    invoke: async input => {
      if (input.request.role === 'respondent') {
        order.push(++responses);
        if (responses === 1) throw new PilotTechnicalError('', {retryable: true, code: 'provider_http_503'});
      }
      if (input.request.role === 'judge' && ++judgeCalls === 1) return response('{}');
      return invoke(input);
    },
  });
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(result.responses.attempts, 3);
  assert.equal(judgeCalls, 4);
  assert.equal(result.judgments.pairedResponses, 1);
  assert.equal(result.rejectedJudgments[0].kind, 'rejected_judgment');
});

test('cached Workflow replay repeats neither sends nor durable writes', async () => {
  const bucket = new Bucket();
  const cache = new Map();
  /** @type {{run<T>(name: string, callback: () => Promise<T>): Promise<T>}} */
  const cached = {
    async run(name, callback) {
      if (!cache.has(name)) cache.set(name, await callback());
      return cache.get(name);
    },
  };
  let sends = 0;
  const args = {
    bucket,
    campaign: {...campaign, trials: trials.slice(0, 2)},
    manifestSha256: 'a'.repeat(64),
    credentials,
    steps: cached,
    now,
    invoke: async (/** @type {Parameters<typeof invoke>[0]} */ input) => {
      sends++;
      return invoke(input);
    },
  };
  const first = await runCampaign(args);
  const writes = bucket.version;
  const replay = await runCampaign(args);
  assert.deepEqual(replay, first);
  assert.equal(sends, 9);
  assert.equal(bucket.version, writes);
});

test('budget exhaustion is a fatal execution stop, never a provider retry or successful result', async () => {
  const bucket = new Bucket();
  let sends = 0;
  await assert.rejects(
    runCampaign({
      bucket,
      campaign: {...campaign, trials: trials.slice(0, 2), manifest: {...campaign.manifest, budgetCapMicrousd: 1}},
      manifestSha256: 'a'.repeat(64),
      credentials,
      steps,
      now,
      invoke: async () => {
        sends++;
        return response();
      },
    }),
    /campaign_durable_or_budget_stop/,
  );
  assert.equal(sends, 0);
  assert.equal(bucket.rows.has(prefix + 'result.json'), false);
});

async function approvedInputs() {
  const bucket = new Bucket();
  /** @type {Record<string,{sha256:string;bytes:number}>} */ const inputs = {};
  for (const name of [
    'experiment-plan.json',
    'scenarios.json',
    'judging-rubric.json',
    ...['fr', 'en'].flatMap(lang =>
      ['pack.json', 'canonical-text.md', 'canonical-prose.md'].map(suffix => lang + '.' + suffix),
    ),
  ]) {
    const bytes = await readFile(new URL(name, source));
    inputs[name] = {sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
    bucket.rows.set(prefix + 'inputs/' + name, {text: bytes.toString('utf8'), etag: 'input'});
  }
  const preflight = await writeCampaignRecord(bucket, prefix + 'preflight.json', {
    status: 'ready',
    campaignId: 'synthetic',
    observedAt: now().toISOString(),
    models: Object.fromEntries(
      Object.entries(PROVIDER_PROFILES).map(([provider, model]) => [
        provider,
        {id: model.model, contextLimit: model.contextLimit, metadataSha256: 'b'.repeat(64)},
      ]),
    ),
  });
  const unique = new Map();
  for (const trial of trials) {
    const request = buildProviderRequest({
      provider: 'anthropic',
      promptBytes: trial.promptBytes,
      outputTokenLimit: 512,
    });
    const sha = createHash('sha256').update(request.body).digest('hex');
    unique.set(sha, {
      kind: 'assembled_prompt',
      requestSha256: sha,
      inputTokens: 100,
      observedAt: now().toISOString(),
      provider: 'anthropic',
      model: PROVIDER_PROFILES.anthropic.model,
      endpoint: 'https://api.anthropic.com/v1/messages/count_tokens',
      generation: false,
      costMicrousd: 0,
      rawBody: '{"input_tokens":100}',
      responseSha256: createHash('sha256').update('{"input_tokens":100}').digest('hex'),
    });
  }
  const measured = await writeCampaignRecord(bucket, prefix + 'token-measurements.json', {
    schema: 'runtime-pilot-token-counts/1',
    campaignId: 'synthetic',
    model: PROVIDER_PROFILES.anthropic.model,
    measurements: [...unique.values()],
  });
  const saved = await writeCampaignRecord(bucket, prefix + 'manifest.json', {
    ...campaign.manifest,
    admitBefore: '2026-11-07T18:00:00.000Z',
    schema: 'runtime-provider-pilot/1',
    mode: 'provider',
    respondent: 'anthropic',
    inputs,
    preflightSha256: preflight.sha256,
    tokenMeasurementsSha256: measured.sha256,
    pricing: PILOT_PRICING,
    pricingVerifiedAt: now().toISOString(),
    ownerAuthorization: 'synthetic fixture only',
    sourceCommit: 'a'.repeat(40),
    workerBundleSha256: 'c'.repeat(64),
  });
  return {bucket, campaignId: 'synthetic', manifestSha256: saved.sha256, now: now()};
}

test('approved snapshot binds all input bytes and refuses substitutions and expired preflight', async () => {
  const args = await approvedInputs();
  const objects = await snapshotCampaignInputs(args);
  const frozen = await materializeCampaignSnapshot({...args, objects});
  assert.equal(frozen.trials.length, 560);
  const key = prefix + 'inputs/fr.canonical-prose.md';
  objects[key] += 'x';
  await assert.rejects(materializeCampaignSnapshot({...args, objects}), /input_size/);
  const row = args.bucket.rows.get(key);
  assert(row);
  row.text += 'x';
  await assert.rejects(loadCampaign(args), /input_size/);
  const fresh = await approvedInputs();
  await assert.rejects(loadCampaign({...fresh, now: new Date(expiresAt)}), /expired/);
});

test('private status exposes only aggregates and marks interrupted activity stale', async () => {
  const args = await approvedInputs();
  const statusArgs = {...args, workerVersionId: '11111111-2222-4333-8444-555555555555'};
  assert.equal((await readCampaignStatus(statusArgs)).executionState, 'not_started');
  await writeCampaignRecord(args.bucket, prefix + 'execution-identity.json', {
    campaignId: args.campaignId,
    manifestSha256: args.manifestSha256,
    workerVersionId: statusArgs.workerVersionId,
  });
  const ledger = createPilotBudget({
    bucket: args.bucket,
    key: prefix + 'budget.json',
    authorization: {planSha256: args.manifestSha256, capMicrousd: 50_000_000, maximumAttempts: 3366, expiresAt},
    now,
  });
  await ledger.reserve({
    attemptId: 'respondent/trial-0001/1',
    requestSha256: 'b'.repeat(64),
    reservedMicrousd: 100,
    provider: 'anthropic',
    role: 'respondent',
  });
  const current = await readCampaignStatus(statusArgs);
  assert.equal(current.campaignStatus, 'NOT_ESTABLISHED');
  assert.equal(current.unresolvedAttempts, 1);
  assert.equal(current.executionState, 'in_progress');
  assert.equal(
    (await readCampaignStatus({...statusArgs, now: new Date('2026-11-07T12:30:00.000Z')})).executionState,
    'stale',
  );
  assert.equal(JSON.stringify(current).includes('requestSha256'), false);
  assert.equal(JSON.stringify(current).includes('credential'), false);
  await assert.rejects(readCampaignStatus({...statusArgs, manifestSha256: 'f'.repeat(64)}), /manifest_pin/);
  await assert.rejects(
    readCampaignStatus({...statusArgs, workerVersionId: '22222222-2222-4333-8444-555555555555'}),
    /execution_version/,
  );
});

test('permanent and transient provider errors retain their full spending reservation', async () => {
  const bucket = new Bucket();
  const runner = campaignAttemptRunner({
    bucket,
    prefix,
    ledger: ledgerFor(bucket),
    credentials,
    now,
    invoke: async () => {
      throw new PilotTechnicalError('', {code: 'provider_http_400', retryable: false});
    },
  });
  const saved = await runner('respondent/trial-0001/1', request);
  assert.equal(saved.error.retryable, false);
  const entry = await ledgerFor(bucket).inspect('respondent/trial-0001/1');
  assert(entry);
  assert.equal(entry.state, 'uncertain');
  assert.equal((await ledgerFor(bucket).summary()).committedMicrousd, 501280);
});

test('failed or near-timeout native preflight stops before any scientific trial', async () => {
  for (const slow of [false, true]) {
    const bucket = new Bucket();
    let elapsed = 0,
      respondentCalls = 0;
    await assert.rejects(
      runCampaign({
        bucket,
        campaign: {...campaign, trials: trials.slice(0, 2)},
        manifestSha256: 'a'.repeat(64),
        credentials,
        steps,
        now: () => new Date(now().getTime() + elapsed),
        invoke: async input => {
          if (input.request.role === 'respondent') respondentCalls++;
          if (input.request.role === 'preflight' && input.request.provider === 'deepinfra') {
            assert.equal(input.timeoutMs, 300000);
            if (!slow) throw new PilotTechnicalError('', {code: 'provider_http_503', retryable: true});
            elapsed += 240000;
          }
          return invoke(input);
        },
      }),
      slow ? /preflight_latency/ : /native_preflight/,
    );
    assert.equal(respondentCalls, 0);
    assert.equal(bucket.rows.has(prefix + 'result.json'), false);
    assert((await ledgerFor(bucket).summary()).committedMicrousd > 0);
  }
});

test('permanent judge errors are not retried and technical-only replies are excluded from judgment counts', async () => {
  const bucket = new Bucket();
  let respondentCalls = 0,
    judgeCalls = 0;
  const result = await runCampaign({
    bucket,
    campaign: {...campaign, trials: trials.slice(0, 2)},
    manifestSha256: 'a'.repeat(64),
    credentials,
    steps,
    now,
    invoke: async input => {
      if (input.request.role === 'respondent' && ++respondentCalls === 1)
        throw new PilotTechnicalError('', {code: 'provider_http_400', retryable: false});
      if (input.request.role === 'judge' && ++judgeCalls === 1)
        throw new PilotTechnicalError('', {code: 'provider_http_400', retryable: false});
      return invoke(input);
    },
  });
  assert.equal(respondentCalls, 2);
  assert.equal(judgeCalls, 2);
  assert.equal(result.responses.technicalOnly, 1);
  assert.equal(result.judgments.responsesNotReceived, 1);
  assert.equal(result.judgments.expectedResponses, 1);
  assert.equal(result.judgments.missingPairs, 1);
  assert.equal(result.responses.judgmentsPending, 1);
});

test('snapshot admission and ledger dispatch have distinct deadlines', async () => {
  const args = await approvedInputs();
  const objects = await snapshotCampaignInputs(args);
  await assert.rejects(
    materializeCampaignSnapshot({...args, objects, now: new Date('2026-11-07T18:00:00.000Z')}),
    /expired/,
  );
  // A durable replay uses the original admittedAt, not the later wall clock.
  const restored = await materializeCampaignSnapshot({...args, objects, now: args.now});
  assert.equal(restored.trials.length, 560);
  const expired = createPilotBudget({
    bucket: args.bucket,
    key: prefix + 'budget.json',
    authorization: {planSha256: args.manifestSha256, capMicrousd: 50_000_000, maximumAttempts: 3366, expiresAt},
    now: () => new Date(expiresAt),
  });
  await assert.rejects(
    expired.reserve({
      attemptId: 'respondent/trial-0001/1',
      requestSha256: 'b'.repeat(64),
      reservedMicrousd: 100,
      provider: 'anthropic',
      role: 'respondent',
    }),
    /budget_expired/,
  );
});

test('insufficient time after real-shaped preflights stops before scientific dispatch', async () => {
  const bucket = new Bucket();
  let preflightCalls = 0,
    respondentCalls = 0;
  await assert.rejects(
    runCampaign({
      bucket,
      campaign: {
        ...campaign,
        trials: trials.slice(0, 2),
        manifest: {...campaign.manifest, expiresAt: new Date(now().getTime() + 15 * 60000).toISOString()},
      },
      manifestSha256: 'a'.repeat(64),
      credentials,
      steps,
      now,
      invoke: async input => {
        if (input.request.role === 'preflight') preflightCalls++;
        if (input.request.role === 'respondent') respondentCalls++;
        return invoke(input);
      },
    }),
    /campaign_runtime_window/,
  );
  assert.equal(preflightCalls, 3);
  assert.equal(respondentCalls, 0);
  assert.equal(bucket.rows.has(prefix + 'result.json'), false);
});

/** @param {Bucket} bucket @param {any} payload */
async function pinRecovery(bucket, payload) {
  const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  await writeCampaignRecord(bucket, prefix + `recoveries/${digest}.json`, payload);
  return digest;
}

async function rejectedPreflightFixture() {
  const args = await approvedInputs();
  const smallCampaign = {...campaign, trials: trials.slice(0, 2)};
  const priorWorkerVersionId = '11111111-2222-4333-8444-555555555555';
  const workerVersionId = '22222222-2222-4333-8444-555555555555';
  const priorIdentity = await writeCampaignRecord(args.bucket, prefix + 'execution-identity.json', {
    campaignId: args.campaignId,
    manifestSha256: args.manifestSha256,
    workerVersionId: priorWorkerVersionId,
    admittedAt: now().toISOString(),
  });
  let initialCalls = 0;
  await assert.rejects(
    runCampaign({
      bucket: args.bucket,
      campaign: smallCampaign,
      manifestSha256: args.manifestSha256,
      credentials,
      steps,
      now,
      invoke: async input => {
        initialCalls++;
        if (input.request.provider !== 'deepinfra') return invoke(input);
        const annotation = await invoke(input);
        const raw = JSON.stringify({
          id: 'synthetic-deepinfra',
          model: input.request.model,
          choices: [{index: 0, finish_reason: 'stop', message: {role: 'assistant', content: annotation.rawText}}],
          usage: {
            prompt_tokens: 4667,
            completion_tokens: 723,
            total_tokens: 5390,
            prompt_tokens_details: {cached_tokens: 0, cache_write_tokens: null},
          },
        });
        const error = new PilotTechnicalError('', {
          code: 'provider_usage_details',
          retryable: false,
          partialResponse: raw,
          deliveryState: 'response_rejected',
        });
        error.responseSha256 = createHash('sha256').update(raw).digest('hex');
        throw error;
      },
    }),
    /campaign_native_preflight/,
  );
  assert.equal(initialCalls, 2);
  const failed = await readCampaignRecord(args.bucket, prefix + 'attempts/preflight/deepinfra/1.json');
  const rawBudget = args.bucket.rows.get(prefix + 'budget.json');
  assert(rawBudget && failed);
  const beforeBudget = JSON.parse(rawBudget.text);
  const payload = {
    schema: 'runtime-pilot-preflight-recovery/1',
    campaignId: args.campaignId,
    manifestSha256: args.manifestSha256,
    priorWorkerVersionId,
    priorIdentitySha256: priorIdentity.sha256,
    priorBudgetSha256: beforeBudget.sha256,
    attemptId: 'preflight/deepinfra/1',
    attemptSha256: failed.sha256,
    responseSha256: failed.payload.error.responseSha256,
    runtimeSourceCommit: 'b'.repeat(40),
    runtimeBundleSha256: 'c'.repeat(64),
  };
  const recoverySha256 = await pinRecovery(args.bucket, payload);
  return {...args, campaign: smallCampaign, workerVersionId, beforeBudget, payload, recoverySha256};
}

test('pinned recovery revalidates retained preflight bytes without resending, resetting or discounting the uncertain call', async () => {
  const args = await rejectedPreflightFixture();
  const originals = [
    'execution-identity.json',
    'budget-started.json',
    'attempts/preflight/anthropic/1.json',
    'attempts/preflight/deepinfra/1.json',
  ].map(name => [name, args.bucket.rows.get(prefix + name)?.text]);
  const recovery = await admitCampaignRecovery(args);
  assert.equal(args.bucket.rows.get(prefix + 'budget.json')?.text, JSON.stringify(args.beforeBudget));
  await assert.rejects(readCampaignStatus({...args, recoverySha256: null}), /campaign_execution_version/);
  await assert.rejects(
    readCampaignStatus({...args, recoverySha256: args.recoverySha256}),
    /campaign_recovery_execution_version/,
  );
  await writeCampaignRecord(args.bucket, prefix + `execution-identities/${args.workerVersionId}.json`, {
    campaignId: args.campaignId,
    manifestSha256: args.manifestSha256,
    workerVersionId: args.workerVersionId,
    admittedAt: recovery.admittedAt,
    recoverySha256: args.recoverySha256,
  });
  const status = await readCampaignStatus({...args, recoverySha256: args.recoverySha256});
  assert.equal(status.campaignStatus, 'NOT_ESTABLISHED');
  assert.equal(status.unresolvedAttempts, 1);
  assert.equal(status.workerVersionId, args.workerVersionId);
  let calls = 0;
  const result = await runCampaign({
    bucket: args.bucket,
    campaign: args.campaign,
    manifestSha256: args.manifestSha256,
    credentials,
    steps,
    now,
    recovery,
    invoke: async input => {
      calls++;
      assert(!(input.request.role === 'preflight' && ['anthropic', 'deepinfra'].includes(input.request.provider)));
      return invoke(input);
    },
  });
  assert.equal(calls, 7); // Mistral preflight, two responses and four judgments.
  assert.equal(result.spend.attempts, 9);
  assert.equal(result.spend.unresolvedAttempts, 1);
  assert.equal(result.status, 'SYNTHETIC_RUN');
  assert.equal(result.judgments.acceptedAnnotations, 4);
  const afterBudget = JSON.parse(args.bucket.rows.get(prefix + 'budget.json')?.text ?? '{}');
  assert.deepEqual(afterBudget.payload.authorization, args.beforeBudget.payload.authorization);
  for (const id of ['preflight/anthropic/1', 'preflight/deepinfra/1'])
    assert.deepEqual(afterBudget.payload.attempts[id], args.beforeBudget.payload.attempts[id]);
  for (const [name, text] of originals) assert.equal(args.bucket.rows.get(prefix + name)?.text, text);
  assert.equal(
    (await readCampaignRecord(args.bucket, prefix + `reconciliations/${args.recoverySha256}.json`))?.payload
      .reservationRetainedMicrousd,
    args.beforeBudget.payload.attempts['preflight/deepinfra/1'].reservedMicrousd,
  );
  assert.deepEqual(await admitCampaignRecovery(args), recovery); // Admission is durable after budget advancement.
});

test('recovery refuses unpinned scope, changed prior identity, missing marker and already advanced budget', async () => {
  for (const defect of ['pin', 'scope', 'identity', 'marker', 'budget', 'worker', 'advanced']) {
    const args = await rejectedPreflightFixture();
    if (defect === 'pin') args.recoverySha256 = 'f'.repeat(64);
    if (defect === 'scope')
      args.recoverySha256 = await pinRecovery(args.bucket, {...args.payload, attemptId: 'respondent/trial-0001/1'});
    if (defect === 'identity')
      args.recoverySha256 = await pinRecovery(args.bucket, {...args.payload, priorIdentitySha256: 'f'.repeat(64)});
    if (defect === 'marker') args.bucket.rows.delete(prefix + 'budget-started.json');
    if (defect === 'budget')
      args.recoverySha256 = await pinRecovery(args.bucket, {...args.payload, priorBudgetSha256: 'f'.repeat(64)});
    if (defect === 'worker') args.workerVersionId = args.payload.priorWorkerVersionId;
    if (defect === 'advanced') {
      const ledger = createPilotBudget({
        bucket: args.bucket,
        key: prefix + 'budget.json',
        authorization: args.beforeBudget.payload.authorization,
        now,
      });
      await ledger.reserve({
        attemptId: 'respondent/trial-0001/1',
        requestSha256: 'd'.repeat(64),
        reservedMicrousd: 100,
        provider: 'anthropic',
        role: 'respondent',
      });
      const advanced = JSON.parse(args.bucket.rows.get(prefix + 'budget.json')?.text ?? '{}');
      args.recoverySha256 = await pinRecovery(args.bucket, {...args.payload, priorBudgetSha256: advanced.sha256});
    }
    const before = args.bucket.rows.get(prefix + 'budget.json')?.text;
    await assert.rejects(admitCampaignRecovery(args), /campaign_recovery_/);
    assert.equal(args.bucket.rows.get(prefix + 'budget.json')?.text, before);
  }
});

test('a recovery definition cannot be passed directly to bypass execution admission', async () => {
  const args = await rejectedPreflightFixture();
  const recovery = {...(await readCampaignRecovery(args)), workerVersionId: args.workerVersionId};
  let calls = 0;
  await assert.rejects(
    runCampaign({
      bucket: args.bucket,
      campaign: args.campaign,
      manifestSha256: args.manifestSha256,
      credentials,
      steps,
      now,
      recovery,
      invoke: async input => {
        calls++;
        return invoke(input);
      },
    }),
    /campaign_recovery_execution_version/,
  );
  assert.equal(calls, 0);
});

test('admitted recovery still fails closed if ledger and marker disappear or a retained reservation changes', async () => {
  for (const defect of ['lost', 'reservation', 'bytes']) {
    const args = await rejectedPreflightFixture();
    const recovery = await admitCampaignRecovery(args);
    await writeCampaignRecord(args.bucket, prefix + `execution-identities/${args.workerVersionId}.json`, {
      campaignId: args.campaignId,
      manifestSha256: args.manifestSha256,
      workerVersionId: args.workerVersionId,
      admittedAt: recovery.admittedAt,
      recoverySha256: args.recoverySha256,
    });
    if (defect === 'lost') {
      args.bucket.rows.delete(prefix + 'budget.json');
      args.bucket.rows.delete(prefix + 'budget-started.json');
      args.bucket.rows.delete(prefix + 'attempts/preflight/anthropic/1.json');
    } else if (defect === 'reservation') {
      const row = args.bucket.rows.get(prefix + 'budget.json');
      assert(row);
      const budget = JSON.parse(row.text);
      budget.payload.attempts['preflight/deepinfra/1'].reservedMicrousd--;
      budget.sha256 = createHash('sha256').update(JSON.stringify(budget.payload)).digest('hex');
      row.text = JSON.stringify(budget);
    } else {
      recovery.responseSha256 = 'f'.repeat(64);
    }
    let calls = 0;
    await assert.rejects(
      runCampaign({
        bucket: args.bucket,
        campaign: args.campaign,
        manifestSha256: args.manifestSha256,
        credentials,
        steps,
        now,
        recovery,
        invoke: async input => {
          calls++;
          return invoke(input);
        },
      }),
      /campaign_recovery_/,
    );
    assert.equal(calls, 0);
  }
});
