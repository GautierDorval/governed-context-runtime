// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotBudget, tokenCostMicrousd} from '../spec/examples/semantic-boundaries/pilot-budget.mjs';

class Bucket {
  /** @type {Map<string,{text:string;etag:string}>} */
  rows = new Map();
  revision = 0;
  /** @param {string} key */
  async get(key) {
    const row = this.rows.get(key);
    return row ? {etag: row.etag, size: Buffer.byteLength(row.text), text: async () => row.text} : null;
  }
  /** @param {string} key @param {string} text @param {{onlyIf:{etagMatches?:string;etagDoesNotMatch?:string}}} options */
  async put(key, text, options) {
    const row = this.rows.get(key);
    if (
      (options.onlyIf.etagDoesNotMatch === '*' && row) ||
      (options.onlyIf.etagMatches && options.onlyIf.etagMatches !== row?.etag)
    )
      return null;
    const value = {text, etag: String(++this.revision)};
    this.rows.set(key, value);
    return {etag: value.etag};
  }
}
const authorization = {
  planSha256: 'a'.repeat(64),
  capMicrousd: 100,
  maximumAttempts: 4,
  expiresAt: '2026-11-08T00:00:00.000Z',
};
const key = 'campaigns/synthetic/budget.json';
const now = () => new Date('2026-11-07T00:00:00.000Z');
/** @param {string} attemptId @param {number} [reservedMicrousd] */
const attempt = (attemptId, reservedMicrousd = 60) => ({
  attemptId,
  reservedMicrousd,
  requestSha256: 'b'.repeat(64),
  provider: /** @type {const} */ ('anthropic'),
  role: /** @type {const} */ ('respondent'),
});

test('decimal pricing rounds up without binary float under-reservation', () => {
  assert.equal(tokenCostMicrousd(1, 0, {inputUsdPerMillion: '0.000000001', outputUsdPerMillion: '0'}), 1);
  assert.equal(tokenCostMicrousd(1000, 512, {inputUsdPerMillion: '0.7', outputUsdPerMillion: '2.1'}), 1776);
  assert.throws(() => tokenCostMicrousd(-1, 0, {inputUsdPerMillion: '1', outputUsdPerMillion: '1'}));
});

test('concurrent reservations cannot cross the shared cap', async () => {
  const bucket = new Bucket();
  const left = createPilotBudget({bucket, key, authorization, now});
  const right = createPilotBudget({bucket, key, authorization, now});
  const results = await Promise.allSettled([left.reserve(attempt('a')), right.reserve(attempt('b'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.deepEqual(await left.summary(), {committedMicrousd: 60, unresolvedAttempts: 1, attempts: 1});
});

for (const state of ['reserved', 'uncertain', 'settled']) {
  test('restart cannot resend an attempt in state ' + state + ' even when a second reservation fits', async () => {
    const bucket = new Bucket();
    const ledger = createPilotBudget({bucket, key, authorization, now});
    // A second reservation fits under the cap in every state: only the duplicate guard can reject it.
    await ledger.reserve(attempt('a', 40));
    if (state !== 'reserved') {
      await ledger.finish({
        attemptId: 'a',
        outcomeSha256: 'c'.repeat(64),
        ...(state === 'settled' ? {priceBasedUpperBoundMicrousd: 20} : {}),
      });
    }
    const before = structuredClone([...bucket.rows]);
    const writes = bucket.revision;
    const restarted = createPilotBudget({bucket, key, authorization, now});
    await assert.rejects(restarted.reserve(attempt('a', 40)), /already_reserved/);
    assert.equal(bucket.revision, writes);
    assert.deepEqual([...bucket.rows], before);
    assert.equal((await restarted.inspect('a'))?.state, state);
    const committedMicrousd = state === 'settled' ? 20 : 40;
    const unresolvedAttempts = state === 'settled' ? 0 : 1;
    assert.deepEqual(await restarted.summary(), {committedMicrousd, unresolvedAttempts, attempts: 1});
    await restarted.reserve(attempt('b', authorization.capMicrousd - committedMicrousd));
    assert.deepEqual(await restarted.summary(), {
      committedMicrousd: authorization.capMicrousd,
      unresolvedAttempts: unresolvedAttempts + 1,
      attempts: 2,
    });
  });
}

test('uncertain failures keep their ceiling; only verified settlement releases unused reservation', async () => {
  const bucket = new Bucket();
  const ledger = createPilotBudget({bucket, key, authorization, now});
  await ledger.reserve(attempt('a'));
  await ledger.finish({attemptId: 'a', outcomeSha256: 'c'.repeat(64)});
  assert.equal((await ledger.summary()).committedMicrousd, 60);
  await assert.rejects(ledger.reserve(attempt('b')), /budget_cap/);
  await ledger.reserve(attempt('b', 40));
  await ledger.finish({attemptId: 'b', outcomeSha256: 'd'.repeat(64), priceBasedUpperBoundMicrousd: 5});
  assert.equal((await ledger.summary()).committedMicrousd, 65);
  await assert.rejects(
    ledger.finish({attemptId: 'a', outcomeSha256: 'c'.repeat(64), priceBasedUpperBoundMicrousd: 0}),
    /terminal/,
  );
});

test('expired, changed, corrupted and oversized authorizations fail closed', async () => {
  const bucket = new Bucket();
  const ledger = createPilotBudget({bucket, key, authorization, now});
  await ledger.reserve(attempt('a'));
  await assert.rejects(
    createPilotBudget({bucket, key, authorization: {...authorization, capMicrousd: 101}, now}).summary(),
    /authorization_changed/,
  );
  await assert.rejects(
    createPilotBudget({bucket, key, authorization, now: () => new Date(authorization.expiresAt)}).reserve(
      attempt('b', 1),
    ),
    /expired/,
  );
  assert.throws(
    () => createPilotBudget({bucket, key, authorization: {...authorization, capMicrousd: 50_000_001}, now}),
    /authorization/,
  );
  const row = bucket.rows.get(key);
  assert(row);
  row.text = row.text.replace('"reservedMicrousd":60', '"reservedMicrousd":1');
  await assert.rejects(ledger.summary(), /integrity/);
});

test('a lost ledger cannot renew the cap after the immutable dispatch marker exists', async () => {
  const bucket = new Bucket();
  const ledger = createPilotBudget({bucket, key, authorization, now});
  await ledger.reserve(attempt('a'));
  await ledger.finish({attemptId: 'a', outcomeSha256: 'c'.repeat(64)});
  assert(bucket.rows.has('campaigns/synthetic/budget-started.json'));
  bucket.rows.delete(key);
  const restarted = createPilotBudget({bucket, key, authorization, now});
  await assert.rejects(restarted.summary(), /budget_ledger_lost/);
  await assert.rejects(restarted.reserve(attempt('b')), /budget_ledger_lost/);
  assert.equal(bucket.rows.has(key), false);
});
