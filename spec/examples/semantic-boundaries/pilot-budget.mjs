// SPDX-License-Identifier: Apache-2.0
import {assertValue, digestBytes, parseProviderJson} from './pilot-json.mjs';

const encoder = new TextEncoder();
const HASH = /^[a-f0-9]{64}$/;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const SCHEMA = 'runtime-pilot-spend/1';
const MAX_LEDGER_BYTES = 4_194_304;

/** USD per million tokens multiplied by tokens yields micro-USD. Round upward exactly. */
export function tokenCostMicrousd(inputTokens, outputTokens, pricing) {
  assertValue(integer(inputTokens) && integer(outputTokens), 'budget_tokens');
  function rate(value) {
    assertValue(typeof value === 'string' && /^(0|[1-9][0-9]{0,5})(\.[0-9]{1,9})?$/.test(value), 'budget_price');
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
  }
  const numerator = BigInt(inputTokens) * rate(pricing.inputUsdPerMillion) + BigInt(outputTokens) * rate(pricing.outputUsdPerMillion);
  const result = (numerator + 999_999_999n) / 1_000_000_000n;
  assertValue(result <= BigInt(Number.MAX_SAFE_INTEGER), 'budget_overflow');
  return Number(result);
}

async function envelope(payload) {
  return JSON.stringify({schema: SCHEMA, payload, sha256: await digestBytes(encoder.encode(JSON.stringify(payload)))});
}
function counts(state) {
  let committedMicrousd = 0, unresolvedAttempts = 0;
  for (const attempt of Object.values(state.attempts)) {
    assertValue(integer(attempt.reservedMicrousd) && attempt.reservedMicrousd > 0 && HASH.test(attempt.requestSha256), 'budget_integrity');
    assertValue(['reserved', 'settled', 'uncertain'].includes(attempt.state), 'budget_integrity');
    if (attempt.state === 'settled') {
      assertValue(integer(attempt.priceBasedUpperBoundMicrousd) && attempt.priceBasedUpperBoundMicrousd <= attempt.reservedMicrousd && HASH.test(attempt.outcomeSha256), 'budget_integrity');
      committedMicrousd += attempt.priceBasedUpperBoundMicrousd;
    } else {
      committedMicrousd += attempt.reservedMicrousd;
      unresolvedAttempts++;
    }
  }
  assertValue(integer(committedMicrousd) && committedMicrousd <= state.authorization.capMicrousd, 'budget_integrity');
  return {committedMicrousd, unresolvedAttempts, attempts: Object.keys(state.attempts).length};
}
function activity(state) {
  const roles = Object.fromEntries(['preflight', 'respondent', 'judge'].map(role => [role, {reserved: 0, settled: 0, uncertain: 0}]));
  let lastActivityAt = null;
  for (const attempt of Object.values(state.attempts)) {
    assertValue(Object.hasOwn(roles, attempt.role), 'budget_integrity');
    roles[attempt.role][attempt.state]++;
    for (const time of [attempt.reservedAt, attempt.finishedAt].filter(Boolean)) {
      assertValue(new Date(time).toISOString() === time, 'budget_integrity');
      if (!lastActivityAt || time > lastActivityAt) lastActivityAt = time;
    }
  }
  return {...counts(state), roles, lastActivityAt};
}

/**
 * One campaign-wide R2 ledger: conditional writes serialize reservations across all providers.
 * A replay can return a retained outcome, but can never reserve a second send for the same ID.
 * Only verified token usage releases unused reservation; every uncertain call keeps its ceiling.
 */
export function createPilotBudget({bucket, key, authorization, now = () => new Date()}) {
  assertValue(typeof key === 'string' && /^campaigns\/[a-z0-9-]{1,80}\/budget\.json$/.test(key), 'budget_key');
  assertValue(HASH.test(authorization.planSha256) && integer(authorization.capMicrousd) && authorization.capMicrousd > 0 && authorization.capMicrousd <= 50_000_000, 'budget_authorization');
  assertValue(integer(authorization.maximumAttempts) && authorization.maximumAttempts > 0 && authorization.maximumAttempts <= 3500, 'budget_attempt_ceiling');
  assertValue(new Date(authorization.expiresAt).toISOString() === authorization.expiresAt, 'budget_expiry');
  // Never retain a mutable caller-owned grant.
  const grant = JSON.parse(JSON.stringify(authorization));
  const startedKey = key.replace(/budget\.json$/, 'budget-started.json');
  const startedText = JSON.stringify({schema: 'runtime-pilot-budget-started/1', authorization: grant});
  async function read() {
    const object = await bucket.get(key);
    if (!object) {
      // Once a dispatch was admitted, losing the mutable ledger cannot renew the owner's grant.
      assertValue(await bucket.get(startedKey) === null, 'budget_ledger_lost');
      return {object: null, state: {authorization: grant, attempts: Object.create(null)}};
    }
    assertValue(object.size <= MAX_LEDGER_BYTES, 'budget_size');
    const text = await object.text();
    assertValue(encoder.encode(text).byteLength <= MAX_LEDGER_BYTES, 'budget_size');
    // The ledger is integer-only, unlike optional provider diagnostics; parser depth is bounded.
    const record = parseProviderJson(text);
    assertValue(record.schema === SCHEMA && await digestBytes(encoder.encode(JSON.stringify(record.payload))) === record.sha256, 'budget_integrity');
    assertValue(JSON.stringify(record.payload.authorization) === JSON.stringify(grant), 'budget_authorization_changed');
    assertValue(record.payload.attempts && !Array.isArray(record.payload.attempts), 'budget_integrity');
    counts(record.payload);
    return {object, state: record.payload};
  }
  async function change(update) {
    for (let conflict = 0; conflict < 8; conflict++) {
      const {object, state} = await read();
      const result = update(state);
      const summary = counts(state);
      const text = await envelope(state);
      assertValue(encoder.encode(text).byteLength <= MAX_LEDGER_BYTES, 'budget_size');
      const written = await bucket.put(key, text, {onlyIf: object ? {etagMatches: object.etag} : {etagDoesNotMatch: '*'}, httpMetadata: {contentType: 'application/json', cacheControl: 'no-store'}});
      if (written) return {...result, ...summary};
    }
    throw new Error('budget_write_conflict');
  }
  return {
    async summary() { return counts((await read()).state); },
    async activity() { return activity((await read()).state); },
    async inspect(attemptId) { return (await read()).state.attempts[attemptId] ?? null; },
    async reserve({attemptId, requestSha256, reservedMicrousd, provider, role}) {
      assertValue(typeof attemptId === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,180}$/.test(attemptId), 'budget_attempt_identity');
      assertValue(HASH.test(requestSha256) && integer(reservedMicrousd) && reservedMicrousd > 0, 'budget_reservation');
      assertValue(['anthropic', 'deepinfra', 'mistral'].includes(provider) && ['respondent', 'judge', 'preflight'].includes(role), 'budget_scope');
      const result = await change(state => {
        const time = now();
        assertValue(time.getTime() < Date.parse(grant.expiresAt), 'budget_expired');
        assertValue(!Object.hasOwn(state.attempts, attemptId), 'attempt_already_reserved');
        const summary = counts(state);
        assertValue(summary.attempts < grant.maximumAttempts, 'budget_attempt_ceiling');
        assertValue(summary.committedMicrousd + reservedMicrousd <= grant.capMicrousd, 'budget_cap');
        state.attempts[attemptId] = {provider, role, requestSha256, reservedMicrousd, state: 'reserved', reservedAt: time.toISOString()};
        return {attemptId};
      });
      const started = await bucket.put(startedKey, startedText, {onlyIf: {etagDoesNotMatch: '*'}, httpMetadata: {contentType: 'application/json', cacheControl: 'no-store'}});
      if (!started) {
        const prior = await bucket.get(startedKey);
        assertValue(prior && prior.size === encoder.encode(startedText).length && await prior.text() === startedText, 'budget_started_binding');
      }
      // The immutable marker is durable before the caller is allowed to dispatch HTTP.
      return result;
    },
    async finish({attemptId, outcomeSha256, priceBasedUpperBoundMicrousd = null}) {
      assertValue(HASH.test(outcomeSha256) && (priceBasedUpperBoundMicrousd === null || integer(priceBasedUpperBoundMicrousd)), 'budget_settlement');
      return change(state => {
        const attempt = state.attempts[attemptId];
        assertValue(attempt && attempt.state === 'reserved', 'budget_attempt_terminal');
        assertValue(priceBasedUpperBoundMicrousd === null || priceBasedUpperBoundMicrousd <= attempt.reservedMicrousd, 'budget_reservation_exceeded');
        attempt.state = priceBasedUpperBoundMicrousd === null ? 'uncertain' : 'settled';
        attempt.outcomeSha256 = outcomeSha256;
        attempt.priceBasedUpperBoundMicrousd = priceBasedUpperBoundMicrousd;
        attempt.finishedAt = now().toISOString();
        return {attemptId};
      });
    },
  };
}
