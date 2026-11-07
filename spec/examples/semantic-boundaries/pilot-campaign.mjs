// SPDX-License-Identifier: Apache-2.0
import {preparePilotTrials, executePilotTrials, PilotTechnicalError, PilotExecutionStopped} from './pilot-execution.mjs';
import {buildProviderRequest, sendProviderRequest, decodeProviderResponse, PROVIDER_PROFILES} from './pilot-provider.mjs';
import {createPilotBudget, tokenCostMicrousd} from './pilot-budget.mjs';
import {JUDGE_INSTRUCTION, prepareJudgeInput, validateJudgeResponse, summarizeJudgments} from './pilot-judging.mjs';
import {assertValue, digestBytes, parseProviderJson} from './pilot-json.mjs';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
const HASH = /^[a-f0-9]{64}$/;
const METADATA = {contentType: 'application/json', cacheControl: 'no-store'};
const INPUT_NAMES = ['experiment-plan.json', 'scenarios.json', 'judging-rubric.json', 'fr.pack.json', 'fr.canonical-text.md', 'fr.canonical-prose.md', 'en.pack.json', 'en.canonical-text.md', 'en.canonical-prose.md'];
export const PILOT_PRICING = Object.freeze({
  // Conservative full-price bounds, verified 2026-11-07. Haiku uses its higher context tier.
  anthropic: Object.freeze({inputUsdPerMillion: '0.50', outputUsdPerMillion: '2.50'}),
  deepinfra: Object.freeze({inputUsdPerMillion: '0.26', outputUsdPerMillion: '0.38'}),
  mistral: Object.freeze({inputUsdPerMillion: '0.70', outputUsdPerMillion: '2.10'}),
});

export async function writeCampaignRecord(bucket, key, payload) {
  const payloadText = JSON.stringify(payload);
  const sha256 = await digestBytes(encoder.encode(payloadText));
  const text = JSON.stringify({schema: 'runtime-pilot-record/1', payload, sha256});
  const saved = await bucket.put(key, text, {onlyIf: {etagDoesNotMatch: '*'}, httpMetadata: METADATA});
  if (!saved) {
    const previous = await readCampaignRecord(bucket, key);
    assertValue(previous.sha256 === sha256, 'campaign_record_changed');
  }
  return {key, sha256};
}
export async function readCampaignRecord(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  assertValue(object.size <= 4_194_304, 'campaign_record_size');
  const text = await object.text();
  assertValue(encoder.encode(text).byteLength <= 4_194_304, 'campaign_record_size');
  const record = parseProviderJson(text);
  assertValue(record.schema === 'runtime-pilot-record/1' && HASH.test(record.sha256) && await digestBytes(encoder.encode(JSON.stringify(record.payload))) === record.sha256, 'campaign_record_integrity');
  return record;
}

/** Native R2 conditional-write qualification, cached before any provider request. No model call. */
export async function qualifyCampaignStorage({bucket, campaignId, manifestSha256}) {
  assertValue(/^[a-z0-9-]{1,80}$/.test(campaignId) && HASH.test(manifestSha256), 'campaign_identity');
  const key = `campaigns/${campaignId}/storage-qualification.json`;
  const payload = {schema: 'runtime-pilot-storage-qualification/1', campaignId, manifestSha256, createOnly: true, staleEtagRejected: true, matchingEtagAccepted: true};
  const payloadText = JSON.stringify(payload);
  const sha256 = await digestBytes(encoder.encode(payloadText));
  const existing = await bucket.get(key);
  if (existing) {
    const record = await readCampaignRecord(bucket, key);
    assertValue(record?.sha256 === sha256, 'campaign_storage_qualification_incomplete');
    return {key, sha256};
  }
  const pending = JSON.stringify({schema: 'runtime-pilot-storage-pending/1', nonce: crypto.randomUUID()});
  assertValue(await bucket.put(key, pending, {onlyIf: {etagDoesNotMatch: '*'}, httpMetadata: METADATA}), 'campaign_storage_create');
  assertValue(await bucket.put(key, pending, {onlyIf: {etagDoesNotMatch: '*'}, httpMetadata: METADATA}) === null, 'campaign_storage_create_only');
  const current = await bucket.get(key);
  assertValue(current && await current.text() === pending && typeof current.etag === 'string', 'campaign_storage_readback');
  assertValue(await bucket.put(key, pending, {onlyIf: {etagMatches: 'invalid-' + current.etag}, httpMetadata: METADATA}) === null, 'campaign_storage_stale_etag');
  const text = JSON.stringify({schema: 'runtime-pilot-record/1', payload, sha256});
  assertValue(await bucket.put(key, text, {onlyIf: {etagMatches: current.etag}, httpMetadata: METADATA}), 'campaign_storage_matching_etag');
  assertValue((await readCampaignRecord(bucket, key))?.sha256 === sha256, 'campaign_storage_readback');
  return {key, sha256};
}

export async function loadCampaign({bucket, manifestSha256, campaignId, now = new Date()}) {
  assertValue(typeof campaignId === 'string' && /^[a-z0-9-]{1,80}$/.test(campaignId) && HASH.test(manifestSha256), 'campaign_identity');
  const prefix = `campaigns/${campaignId}/`;
  const record = await readCampaignRecord(bucket, prefix + 'manifest.json');
  assertValue(record && record.sha256 === manifestSha256, 'campaign_manifest_pin');
  const manifest = record.payload;
  assertValue(manifest.schema === 'runtime-provider-pilot/1' && manifest.campaignId === campaignId && manifest.mode === 'provider', 'campaign_manifest');
  assertValue(/^[a-f0-9]{40}$/.test(manifest.sourceCommit) && HASH.test(manifest.workerBundleSha256), 'campaign_source_pin');
  assertValue(manifest.budgetCapMicrousd === 50_000_000 && manifest.maximumAttempts === 3366, 'campaign_budget');
  assertValue(manifest.respondent === 'anthropic' && JSON.stringify(manifest.reviewers) === '["deepinfra","mistral"]', 'campaign_models');
  assertValue(JSON.stringify(manifest.pricing) === JSON.stringify(PILOT_PRICING), 'campaign_prices');
  assertValue(new Date(manifest.admitBefore).toISOString() === manifest.admitBefore && new Date(manifest.expiresAt).toISOString() === manifest.expiresAt, 'campaign_deadlines');
  assertValue(Date.parse(manifest.admitBefore) > now.getTime() && Date.parse(manifest.expiresAt) > Date.parse(manifest.admitBefore) && Date.parse(manifest.expiresAt) - Date.parse(manifest.admitBefore) <= 7 * 24 * 3600_000, 'campaign_expired');
  assertValue(Date.parse(manifest.expiresAt) > now.getTime() && Date.parse(manifest.pricingVerifiedAt) <= now.getTime() && now.getTime() - Date.parse(manifest.pricingVerifiedAt) <= 72 * 3600_000, 'campaign_expired');
  assertValue(typeof manifest.ownerAuthorization === 'string' && manifest.ownerAuthorization.length > 0 && HASH.test(manifest.preflightSha256), 'campaign_authorization');
  assertValue(HASH.test(manifest.tokenMeasurementsSha256), 'campaign_token_measurements_pin');
  const preflight = await readCampaignRecord(bucket, prefix + 'preflight.json');
  assertValue(preflight && preflight.sha256 === manifest.preflightSha256 && preflight.payload.status === 'ready', 'campaign_preflight');
  assertValue(preflight.payload.campaignId === campaignId && preflight.payload.models && ['anthropic', 'deepinfra', 'mistral'].every(provider => {
    const model = preflight.payload.models[provider];
    return model?.id === PROVIDER_PROFILES[provider].model && Number.isSafeInteger(model.contextLimit) && model.contextLimit > 8192 && model.contextLimit <= PROVIDER_PROFILES[provider].contextLimit && HASH.test(model.metadataSha256);
  }), 'campaign_preflight_models');
  assertValue(Date.parse(preflight.payload.observedAt) <= now.getTime() && now.getTime() - Date.parse(preflight.payload.observedAt) <= 72 * 3600_000, 'campaign_preflight_freshness');
  assertValue(Object.keys(manifest.inputs).sort().join(',') === [...INPUT_NAMES].sort().join(','), 'campaign_input_inventory');
  const files = Object.create(null);
  for (const name of INPUT_NAMES) {
    const pin = manifest.inputs[name];
    assertValue(HASH.test(pin.sha256) && Number.isSafeInteger(pin.bytes) && pin.bytes > 0 && pin.bytes <= 131072, 'campaign_input_pin');
    const object = await bucket.get(prefix + 'inputs/' + name);
    assertValue(object && object.size === pin.bytes, 'campaign_input_size');
    const bytes = new Uint8Array(await object.arrayBuffer());
    assertValue(await digestBytes(bytes) === pin.sha256, 'campaign_input_digest');
    files[name] = bytes;
  }
  const plan = parseProviderJson(decoder.decode(files['experiment-plan.json']));
  const scenarios = parseProviderJson(decoder.decode(files['scenarios.json']));
  const rubric = parseProviderJson(decoder.decode(files['judging-rubric.json']));
  assertValue(manifest.inputs['scenarios.json'].sha256 === plan.caseInput.sha256, 'campaign_scenarios_pin');
  const documentation = {};
  for (const language of ['fr', 'en']) {
    documentation[language] = {};
    for (const condition of ['pack', 'exhaustive_text', 'canonical_prose']) {
      const pin = plan.inputs[language][condition];
      assertValue(manifest.inputs[pin.path]?.sha256 === pin.sha256 && manifest.inputs[pin.path]?.bytes === pin.bytes, 'campaign_document_pin');
      documentation[language][condition] = files[pin.path];
    }
  }
  const trials = preparePilotTrials({plan, scenarios, documentation, configurationId: campaignId});
  const measured = await readCampaignRecord(bucket, prefix + 'token-measurements.json');
  assertValue(measured?.sha256 === manifest.tokenMeasurementsSha256 && measured.payload.schema === 'runtime-pilot-token-counts/1' && measured.payload.campaignId === campaignId && measured.payload.model === PROVIDER_PROFILES.anthropic.model, 'campaign_token_measurements_pin');
  const measurements = measured.payload.measurements;
  assertValue(Array.isArray(measurements) && measurements.length <= 100, 'campaign_token_measurements');
  const indexed = new Map();
  for (const item of measurements.filter(item => item.kind === 'assembled_prompt')) {
    assertValue(HASH.test(item.requestSha256) && !indexed.has(item.requestSha256) && Number.isSafeInteger(item.inputTokens) && item.inputTokens > 0 && item.inputTokens + 512 <= preflight.payload.models.anthropic.contextLimit, 'campaign_token_measurement');
    assertValue(item.provider === 'anthropic' && item.model === PROVIDER_PROFILES.anthropic.model && item.endpoint === 'https://api.anthropic.com/v1/messages/count_tokens' && item.generation === false && item.costMicrousd === 0, 'campaign_token_source');
    assertValue(Date.parse(item.observedAt) <= now.getTime() && now.getTime() - Date.parse(item.observedAt) <= 72 * 3600_000, 'campaign_token_freshness');
    assertValue(await digestBytes(encoder.encode(item.rawBody)) === item.responseSha256 && parseProviderJson(item.rawBody).input_tokens === item.inputTokens, 'campaign_token_response');
    indexed.set(item.requestSha256, item);
  }
  assertValue(indexed.size === 56, 'campaign_token_coverage');
  for (const trial of trials) {
    const request = buildProviderRequest({provider: 'anthropic', promptBytes: trial.promptBytes, outputTokenLimit: 512});
    assertValue(indexed.has(await digestBytes(encoder.encode(request.body))), 'campaign_unmeasured_input');
  }
  return {manifest, prefix, rubric, trials};
}

function snapshotBucket(objects) {
  return {async get(key) {
    if (!Object.hasOwn(objects, key)) return null;
    const text = objects[key];
    assertValue(typeof text === 'string' && text.isWellFormed(), 'campaign_snapshot');
    const bytes = encoder.encode(text);
    return {size: bytes.length, text: async () => text, arrayBuffer: async () => bytes.buffer};
  }};
}

/** A small immutable input snapshot can be cached by Workflows without duplicating 560 prompts. */
export async function snapshotCampaignInputs(options) {
  // Workflows serializes plain objects; null-prototype parser records stay inside this module.
  const objects = {};
  const bucket = {async get(key) {
    const object = await options.bucket.get(key);
    if (!object) return null;
    assertValue(object.size <= 131072, 'campaign_snapshot_size');
    objects[key] = decoder.decode(await object.arrayBuffer());
    return snapshotBucket(objects).get(key);
  }};
  await loadCampaign({...options, bucket});
  assertValue(encoder.encode(JSON.stringify(objects)).length <= 900000, 'campaign_snapshot_size');
  return objects;
}

export function materializeCampaignSnapshot({objects, ...options}) {
  return loadCampaign({...options, bucket: snapshotBucket(objects)});
}

/** Explicitly pinned, additive recovery of the first DeepInfra preflight only. No new grant. */
export async function readCampaignRecovery({bucket, campaignId, manifestSha256, recoverySha256}) {
  assertValue(/^[a-z0-9-]{1,80}$/.test(campaignId) && HASH.test(manifestSha256) && HASH.test(recoverySha256), 'campaign_recovery_pin');
  const prefix = `campaigns/${campaignId}/`;
  const saved = await readCampaignRecord(bucket, prefix + `recoveries/${recoverySha256}.json`);
  const p = saved?.payload;
  const keys = ['schema', 'campaignId', 'manifestSha256', 'priorWorkerVersionId', 'priorIdentitySha256', 'priorBudgetSha256', 'attemptId', 'attemptSha256', 'responseSha256', 'runtimeSourceCommit', 'runtimeBundleSha256'];
  assertValue(saved?.sha256 === recoverySha256 && p && Object.keys(p).sort().join(',') === keys.sort().join(','), 'campaign_recovery_pin');
  assertValue(p.schema === 'runtime-pilot-preflight-recovery/1' && p.campaignId === campaignId && p.manifestSha256 === manifestSha256 && p.attemptId === 'preflight/deepinfra/1', 'campaign_recovery_scope');
  assertValue(['priorIdentitySha256', 'priorBudgetSha256', 'attemptSha256', 'responseSha256', 'runtimeBundleSha256'].every(key => HASH.test(p[key])) && /^[a-f0-9]{40}$/.test(p.runtimeSourceCommit), 'campaign_recovery_provenance');
  const prior = await readCampaignRecord(bucket, prefix + 'execution-identity.json');
  assertValue(prior?.sha256 === p.priorIdentitySha256 && prior.payload.campaignId === campaignId && prior.payload.manifestSha256 === manifestSha256 && prior.payload.workerVersionId === p.priorWorkerVersionId && /^[a-f0-9-]{36}$/.test(p.priorWorkerVersionId), 'campaign_recovery_prior_identity');
  assertValue(new Date(prior.payload.admittedAt).toISOString() === prior.payload.admittedAt, 'campaign_recovery_admission_time');
  return {...p, recoverySha256, admittedAt: prior.payload.admittedAt};
}

export async function admitCampaignRecovery({bucket, campaign, manifestSha256, recoverySha256, workerVersionId}) {
  const recovery = await readCampaignRecovery({bucket, campaignId: campaign.manifest.campaignId, manifestSha256, recoverySha256});
  assertValue(/^[a-f0-9-]{36}$/.test(workerVersionId) && workerVersionId !== recovery.priorWorkerVersionId, 'campaign_recovery_worker');
  const key = campaign.prefix + `recovery-admissions/${recoverySha256}.json`;
  const existing = await readCampaignRecord(bucket, key);
  const object = await bucket.get(campaign.prefix + 'budget.json');
  assertValue(object && object.size <= 4_194_304, 'campaign_recovery_budget');
  const budget = parseProviderJson(await object.text());
  assertValue(budget.schema === 'runtime-pilot-spend/1' && await digestBytes(encoder.encode(JSON.stringify(budget.payload))) === budget.sha256, 'campaign_recovery_budget');
  const ledger = createPilotBudget({bucket, key: campaign.prefix + 'budget.json', authorization: {planSha256: manifestSha256, capMicrousd: campaign.manifest.budgetCapMicrousd, maximumAttempts: campaign.manifest.maximumAttempts, expiresAt: campaign.manifest.expiresAt}});
  await ledger.summary(); // Verifies the original immutable authorization, cap and every reservation.
  assertValue((await ledger.inspect('preflight/anthropic/1'))?.state === 'settled' && (await ledger.inspect(recovery.attemptId))?.state === 'uncertain', 'campaign_recovery_prior_state');
  const marker = await bucket.get(campaign.prefix + 'budget-started.json');
  assertValue(marker && marker.size <= 4096, 'campaign_recovery_marker');
  const started = parseProviderJson(await marker.text());
  assertValue(started.schema === 'runtime-pilot-budget-started/1' && JSON.stringify(started.authorization) === JSON.stringify(budget.payload.authorization), 'campaign_recovery_marker');
  const originalAttempts = Object.fromEntries(['preflight/anthropic/1', 'preflight/deepinfra/1'].map(id => [id, budget.payload.attempts[id]]));
  const proof = {recoverySha256, workerVersionId, priorBudgetSha256: recovery.priorBudgetSha256, originalAttempts};
  if (existing) {
    // Even after admission, loss of both ledger and marker must never renew spending authority.
    assertValue(JSON.stringify(existing.payload) === JSON.stringify(proof), 'campaign_recovery_admission_changed');
    return {...recovery, workerVersionId};
  }
  assertValue(budget.sha256 === recovery.priorBudgetSha256, 'campaign_recovery_budget');
  assertValue(Object.keys(budget.payload.attempts).sort().join(',') === 'preflight/anthropic/1,preflight/deepinfra/1', 'campaign_recovery_already_advanced');
  assertValue(await readCampaignRecord(bucket, campaign.prefix + 'result.json') === null && await readCampaignRecord(bucket, campaign.prefix + 'native-preflight-summary.json') === null, 'campaign_recovery_already_advanced');
  await writeCampaignRecord(bucket, key, proof);
  return {...recovery, workerVersionId};
}

async function requireRecoveryExecution({bucket, prefix, recovery, workerVersionId}) {
  const admitted = await readCampaignRecord(bucket, prefix + `recovery-admissions/${recovery.recoverySha256}.json`);
  const identity = await readCampaignRecord(bucket, prefix + `execution-identities/${workerVersionId}.json`);
  assertValue(admitted?.payload.workerVersionId === workerVersionId && admitted.payload.recoverySha256 === recovery.recoverySha256 && admitted.payload.priorBudgetSha256 === recovery.priorBudgetSha256 && identity?.payload.recoverySha256 === recovery.recoverySha256 && identity.payload.workerVersionId === workerVersionId && identity.payload.campaignId === recovery.campaignId && identity.payload.manifestSha256 === recovery.manifestSha256 && identity.payload.admittedAt === recovery.admittedAt, 'campaign_recovery_execution_version');
  const object = await bucket.get(prefix + 'budget.json');
  const marker = await bucket.get(prefix + 'budget-started.json');
  assertValue(object && object.size <= 4_194_304 && marker && marker.size <= 4096, 'campaign_recovery_budget');
  const budget = parseProviderJson(await object.text());
  const started = parseProviderJson(await marker.text());
  assertValue(budget.schema === 'runtime-pilot-spend/1' && await digestBytes(encoder.encode(JSON.stringify(budget.payload))) === budget.sha256 && started.schema === 'runtime-pilot-budget-started/1' && JSON.stringify(started.authorization) === JSON.stringify(budget.payload.authorization), 'campaign_recovery_budget');
  const originalAttempts = Object.fromEntries(['preflight/anthropic/1', 'preflight/deepinfra/1'].map(id => [id, budget.payload.attempts?.[id]]));
  assertValue(JSON.stringify(originalAttempts) === JSON.stringify(admitted.payload.originalAttempts), 'campaign_recovery_reservation_changed');
}

/** Reinterpret retained HTTP-200 bytes. Never overwrite the attempt or settle its reservation. */
async function reconcilePreflight({bucket, prefix, recovery, request, ledger}) {
  const saved = await readCampaignRecord(bucket, prefix + `attempts/${recovery.attemptId}.json`);
  const p = saved?.payload;
  assertValue(saved?.sha256 === recovery.attemptSha256 && p?.attemptId === recovery.attemptId && request.provider === 'deepinfra' && request.role === 'preflight' && p.request.body === request.body && p.request.provider === request.provider, 'campaign_recovery_attempt');
  assertValue(p.response === null && p.error?.code === 'provider_usage_details' && p.error.deliveryState === 'response_rejected' && p.error.retryable === false, 'campaign_recovery_error');
  const raw = p.error.partialResponse;
  assertValue(typeof raw === 'string' && p.error.responseSha256 === recovery.responseSha256 && await digestBytes(encoder.encode(raw)) === recovery.responseSha256 && p.requestSha256 === await digestBytes(encoder.encode(request.body)), 'campaign_recovery_bytes');
  assertValue(parseProviderJson(raw).usage?.prompt_tokens_details?.cache_write_tokens === null, 'campaign_recovery_null_counter');
  const entry = await ledger.inspect(recovery.attemptId);
  assertValue(entry?.state === 'uncertain' && entry.outcomeSha256 === saved.sha256 && entry.requestSha256 === p.requestSha256, 'campaign_recovery_reservation');
  const response = {...decodeProviderResponse(request, raw), requestSha256: p.requestSha256, responseSha256: recovery.responseSha256};
  const reconciliation = {schema: 'runtime-pilot-preflight-reconciliation/1', recoverySha256: recovery.recoverySha256, originalAttemptSha256: saved.sha256, responseSha256: recovery.responseSha256, reservationRetainedMicrousd: entry.reservedMicrousd};
  await writeCampaignRecord(bucket, prefix + `reconciliations/${recovery.recoverySha256}.json`, {...reconciliation, response});
  return {...p, response, error: null, reconciliation};
}

/** R2 reservations and outcomes survive Worker/Workflow restarts. No network retry lives here. */
export function campaignAttemptRunner({bucket, prefix, ledger, credentials, invoke = sendProviderRequest, now = () => new Date()}) {
  async function settle(attemptId, request, saved) {
    const entry = await ledger.inspect(attemptId);
    assertValue(entry && entry.requestSha256 === await digestBytes(encoder.encode(request.body)), 'campaign_attempt_binding');
    if (entry.state !== 'reserved') {
      assertValue(entry.outcomeSha256 === saved.sha256, 'campaign_settlement_binding');
      return;
    }
    const response = saved.payload.response;
    const cost = response ? tokenCostMicrousd(response.usage.inputTokens, response.usage.outputTokens, PILOT_PRICING[request.provider]) : null;
    await ledger.finish({attemptId, outcomeSha256: saved.sha256, priceBasedUpperBoundMicrousd: cost});
  }
  return async function attempt(attemptId, request) {
    const key = prefix + 'attempts/' + attemptId + '.json';
    const previous = await readCampaignRecord(bucket, key);
    if (previous) {
      assertValue(previous.payload.request.body === request.body && previous.payload.request.provider === request.provider, 'campaign_attempt_changed');
      await settle(attemptId, request, previous);
      return previous.payload;
    }
    // An unresolved reservation has no trustworthy response. Never silently dispatch it again.
    assertValue(await ledger.inspect(attemptId) === null, 'campaign_attempt_unresolved');
    const requestSha256 = await digestBytes(encoder.encode(request.body));
    const reservedMicrousd = tokenCostMicrousd(PROVIDER_PROFILES[request.provider].contextLimit, request.outputTokenLimit, PILOT_PRICING[request.provider]);
    await ledger.reserve({attemptId, requestSha256, reservedMicrousd, provider: request.provider, role: request.role});
    const timeoutMs = PROVIDER_PROFILES[request.provider].timeoutMs;
    const startedAt = now();
    let response = null, error = null;
    try {
      response = await invoke({request, credential: credentials[request.provider], timeoutMs});
    } catch (caught) {
      const known = caught instanceof PilotTechnicalError;
      error = {
        code: known ? caught.code : 'provider_admission_error', message: '',
        retryable: known && caught.retryable === true,
        deliveryState: known ? caught.deliveryState : 'unknown',
        partialResponse: known ? caught.partialResponse : null,
        partialResponseBase64: known ? caught.partialResponseBase64 ?? null : null,
        responseSha256: known ? caught.responseSha256 ?? null : null,
      };
    }
    const receivedAt = now();
    const elapsedMs = receivedAt.getTime() - startedAt.getTime();
    assertValue(Number.isSafeInteger(elapsedMs) && elapsedMs >= 0, 'campaign_attempt_time');
    const payload = {attemptId, request, requestSha256, response, error, startedAt: startedAt.toISOString(), receivedAt: receivedAt.toISOString(), elapsedMs, timeoutMs};
    const saved = await writeCampaignRecord(bucket, key, payload);
    await settle(attemptId, request, {...saved, payload});
    return payload;
  };
}

/** All durable I/O runs inside cached steps. R2 retains the canonical exact-byte records. */
export async function runCampaign({bucket, campaign, manifestSha256, credentials, steps, invoke, recovery = null, now = () => new Date()}) {
  const {prefix, manifest, trials, rubric} = campaign;
  if (recovery) {
    const pinned = await readCampaignRecovery({bucket, campaignId: manifest.campaignId, manifestSha256, recoverySha256: recovery.recoverySha256});
    assertValue(JSON.stringify(recovery) === JSON.stringify({...pinned, workerVersionId: recovery.workerVersionId}), 'campaign_recovery_changed');
    await requireRecoveryExecution({bucket, prefix, recovery, workerVersionId: recovery.workerVersionId});
  }
  const ledger = createPilotBudget({bucket, key: prefix + 'budget.json', authorization: {planSha256: manifestSha256, capMicrousd: manifest.budgetCapMicrousd, maximumAttempts: manifest.maximumAttempts, expiresAt: manifest.expiresAt}, now});
  const mode = invoke ? 'synthetic' : 'provider';
  assertValue(mode === 'synthetic' || trials.length === 560, 'campaign_trial_count');
  const runAttempt = campaignAttemptRunner({bucket, prefix, ledger, credentials, invoke, now});
  async function dispatch(attemptId, request) {
    try {
    return await steps.run(attemptId, async () => {
      const payload = await runAttempt(attemptId, request);
      // Stay below the platform's 1 MiB step-output limit, including JSON escaping.
      assertValue(encoder.encode(JSON.stringify(payload)).length <= 900000, 'campaign_step_size');
      return JSON.parse(JSON.stringify(payload));
    });
    } catch {
      throw new PilotExecutionStopped('campaign_durable_or_budget_stop');
    }
  }
  // One technical smoke per selected model, charged to this same ledger. No hidden SDK retry.
  const preflightTimings = [];
  for (const provider of ['anthropic', ...manifest.reviewers]) {
    const judgeInput = provider === 'anthropic' ? null : prepareJudgeInput({trial: trials[0], rubric, outcome: {kind: 'completed_response', rawText: '', finishReason: 'end_turn', outputLimited: false}});
    const request = buildProviderRequest({provider, role: 'preflight', promptBytes: encoder.encode(judgeInput ? JSON.stringify(judgeInput) : 'Reply with exactly OK.'), outputTokenLimit: judgeInput ? 8192 : 128, systemInstruction: judgeInput ? JUDGE_INSTRUCTION : null});
    let probe = await dispatch('preflight/' + provider + '/1', request);
    if (recovery && provider === 'deepinfra') probe = await steps.run('preflight-reconciliation', async () => JSON.parse(JSON.stringify(await reconcilePreflight({bucket, prefix, recovery, request, ledger}))));
    assertValue(probe.response && !probe.response.outputLimited, 'campaign_native_preflight');
    assertValue(probe.elapsedMs < probe.timeoutMs * 0.8, 'campaign_preflight_latency');
    if (judgeInput) await validateJudgeResponse({rawText: probe.response.rawText, input: judgeInput, trialId: 'preflight', reviewerId: provider});
    else assertValue(probe.response.rawText.trim() === 'OK', 'campaign_native_preflight');
    preflightTimings.push({provider, elapsedMs: probe.elapsedMs, timeoutMs: probe.timeoutMs});
  }
  await steps.run('native-preflight-summary', async () => {
    // Conservative scheduling estimate, not a completion guarantee: three times measured first-pass
    // latency, at least one second per provider, plus thirty minutes for durable orchestration.
    const estimatedWindowMs = 3 * trials.length * preflightTimings.reduce((sum, item) => sum + Math.max(1000, item.elapsedMs), 0) + 30 * 60_000;
    const checkedAt = now();
    const latestScientificStartAt = new Date(Date.parse(manifest.expiresAt) - estimatedWindowMs).toISOString();
    assertValue(checkedAt.getTime() < Date.parse(latestScientificStartAt), 'campaign_runtime_window');
    return writeCampaignRecord(bucket, prefix + 'native-preflight-summary.json', {schema: 'runtime-pilot-native-preflight/1', mode, preflightTimings, checkedAt: checkedAt.toISOString(), estimatedWindowMs, latestScientificStartAt, executionExpiresAt: manifest.expiresAt, ...(recovery ? {recoverySha256: recovery.recoverySha256} : {})});
  });
  let current;
  const execution = await executePilotTrials({
    trials, mode,
    beforeAttempt: async ({trial, attemptNumber}) => { current = {trial, attemptNumber}; },
    journal: async event => {
      const name = event.event === 'attempt_started' || event.event === 'attempt_finished'
        ? `${event.trialId.split('/').at(-1)}-${event.attemptNumber}-${event.event}` : event.event;
      await steps.run('journal/' + name, () => writeCampaignRecord(bucket, prefix + 'journal/' + name + '.json', event));
    },
    send: async input => {
      const request = buildProviderRequest({provider: 'anthropic', promptBytes: input.promptBytes, outputTokenLimit: 512});
      const result = await dispatch(`respondent/${current.trial.trialId.split('/').at(-1)}/${current.attemptNumber}`, request);
      if (result.error) {
        const error = new PilotTechnicalError('', result.error);
        Object.assign(error, result.error);
        throw error;
      }
      return result.response;
    },
  });
  const byTrial = new Map(execution.attempts.filter(attempt => attempt.outcome.kind === 'completed_response').map(attempt => [attempt.trialId, attempt.outcome]));
  const records = [], rejected = [], retryQueue = [];
  async function judge(trial, reviewerId, attemptNumber) {
    const outcome = byTrial.get(trial.trialId);
    const input = prepareJudgeInput({trial, outcome, rubric});
    const request = buildProviderRequest({provider: reviewerId, role: 'judge', promptBytes: encoder.encode(JSON.stringify(input)), systemInstruction: JUDGE_INSTRUCTION, outputTokenLimit: 8192});
    const result = await dispatch(`judge/${trial.trialId.split('/').at(-1)}/${reviewerId}/${attemptNumber}`, request);
    if (result.error) {
      if (attemptNumber === 1 && result.error.retryable) retryQueue.push({trial, reviewerId});
      rejected.push({trialId: trial.trialId, reviewerId, attemptNumber, kind: 'technical_error', code: result.error.code});
      return;
    }
    let record;
    try {
      assertValue(!result.response.outputLimited, 'judge_output_limited');
      record = await validateJudgeResponse({rawText: result.response.rawText, input, trialId: trial.trialId, reviewerId});
    } catch (error) {
      // Validation is distinct from transport; completed bad judgments are never repaired/retried.
      if (!(error instanceof TypeError)) throw error;
      rejected.push({trialId: trial.trialId, reviewerId, attemptNumber, kind: 'rejected_judgment', code: 'judge_contract_rejected'});
      return;
    }
    await steps.run(`annotation/${trial.trialId.split('/').at(-1)}/${reviewerId}`, () => writeCampaignRecord(bucket, prefix + `judgments/${trial.trialId.split('/').at(-1)}/${reviewerId}.json`, record));
    records.push(record);
  }
  for (const trial of trials) if (byTrial.has(trial.trialId)) for (const reviewerId of manifest.reviewers) await judge(trial, reviewerId, 1);
  for (const item of retryQueue) await judge(item.trial, item.reviewerId, 2);
  const summary = summarizeJudgments({trials, completedTrialIds: [...byTrial.keys()], records, reviewerIds: manifest.reviewers, rubric});
  const result = {
    schema: 'runtime-pilot-result/1', campaignId: manifest.campaignId, manifestSha256,
    mode, status: mode === 'synthetic' ? 'SYNTHETIC_RUN' : execution.counts.attempts > 0 ? 'RUN' : 'NOT_RUN',
    executionState: execution.state, responses: {...execution.counts, judgmentsPending: byTrial.size - summary.pairedResponses},
    judgments: summary, rejectedJudgments: rejected,
    spend: await steps.run('final-spend', () => ledger.summary()), billingBasis: 'conservative_full_price_upper_bound_not_invoice',
    scientificScope: 'seven_cases_one_fictional_service_no_global_architecture_claim',
    ...(recovery ? {recoverySha256: recovery.recoverySha256} : {}),
  };
  await steps.run('final-result', () => writeCampaignRecord(bucket, prefix + 'result.json', result));
  return result;
}

/** Private read model. It exposes aggregates only and never initiates provider work. */
export async function readCampaignStatus({bucket, campaignId, manifestSha256, workerVersionId, recoverySha256 = null, now = new Date()}) {
  assertValue(/^[a-z0-9-]{1,80}$/.test(campaignId) && HASH.test(manifestSha256), 'campaign_identity');
  assertValue(typeof workerVersionId === 'string' && /^[a-f0-9-]{36}$/.test(workerVersionId), 'campaign_worker_identity');
  const prefix = `campaigns/${campaignId}/`;
  const saved = await readCampaignRecord(bucket, prefix + 'manifest.json');
  assertValue(saved?.sha256 === manifestSha256 && saved.payload.campaignId === campaignId && saved.payload.mode === 'provider', 'campaign_manifest_pin');
  const manifest = saved.payload;
  assertValue(manifest.budgetCapMicrousd === 50_000_000 && manifest.maximumAttempts === 3366, 'campaign_budget');
  const ledger = createPilotBudget({bucket, key: prefix + 'budget.json', authorization: {planSha256: manifestSha256, capMicrousd: manifest.budgetCapMicrousd, maximumAttempts: manifest.maximumAttempts, expiresAt: manifest.expiresAt}});
  const activity = await ledger.activity();
  const result = await readCampaignRecord(bucket, prefix + 'result.json');
  const recovery = recoverySha256 ? await readCampaignRecovery({bucket, campaignId, manifestSha256, recoverySha256}) : null;
  const executionIdentity = await readCampaignRecord(bucket, prefix + (recovery ? `execution-identities/${workerVersionId}.json` : 'execution-identity.json'));
  if (recovery) await requireRecoveryExecution({bucket, prefix, recovery, workerVersionId});
  if (executionIdentity || activity.attempts > 0 || result) {
    assertValue(executionIdentity?.payload.campaignId === campaignId && executionIdentity.payload.manifestSha256 === manifestSha256 && executionIdentity.payload.workerVersionId === workerVersionId, 'campaign_execution_version');
  }
  if (result) assertValue(result.payload.schema === 'runtime-pilot-result/1' && result.payload.manifestSha256 === manifestSha256 && result.payload.mode === 'provider' && ['RUN', 'NOT_RUN'].includes(result.payload.status), 'campaign_result_binding');
  const age = activity.lastActivityAt === null ? null : now.getTime() - Date.parse(activity.lastActivityAt);
  assertValue(age === null || age >= 0, 'campaign_activity_time');
  return {
    schema: 'runtime-pilot-status/1', campaignId, manifestSha256, workerVersionId,
    observedAt: now.toISOString(), lastActivityAt: activity.lastActivityAt,
    executionState: result ? 'finished' : !activity.attempts ? 'not_started' : age >= 30 * 60_000 ? 'stale' : 'in_progress',
    campaignStatus: result ? result.payload.status : activity.roles.respondent.settled > 0 ? 'RUN' : 'NOT_ESTABLISHED',
    capMicrousd: manifest.budgetCapMicrousd, committedMicrousd: activity.committedMicrousd,
    attempts: activity.attempts, unresolvedAttempts: activity.unresolvedAttempts, roles: activity.roles,
    resultSha256: result?.sha256 ?? null,
  };
}
