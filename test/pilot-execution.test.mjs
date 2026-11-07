// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, appendFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {
  preparePilotTrials,
  executePilotTrials,
  accountPilotAttempts,
  PilotTechnicalError,
} from '../spec/examples/semantic-boundaries/pilot-execution.mjs';

const source = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
const plan = JSON.parse(await readFile(new URL('experiment-plan.json', source), 'utf8'));
const scenarios = JSON.parse(await readFile(new URL('scenarios.json', source), 'utf8'));
/** @type {Record<string, Record<string, Uint8Array>>} */
const documentation = {};
for (const language of ['fr', 'en']) {
  documentation[language] = {};
  for (const condition of ['pack', 'exhaustive_text', 'canonical_prose']) {
    documentation[language][condition] = await readFile(new URL(plan.inputs[language][condition].path, source));
  }
}
const input = {plan, scenarios, documentation, configurationId: 'synthetic-qualification'};
const prepared = preparePilotTrials(input);
/** @param {string} rawText @param {Partial<import('../spec/examples/semantic-boundaries/pilot-execution.mjs').TransportResponse>} extra */
function response(rawText, extra = {}) {
  return {rawText, rawBody: JSON.stringify({text: rawText}), finishReason: 'stop', ...extra};
}
/** @type {(event: unknown) => Promise<void>} */
const discard = async () => {};

test('executable trial order preserves 560 inputs, balanced conditions and opaque identities', () => {
  assert.equal(prepared.length, 560);
  assert.equal(prepared[0].trialId, 'synthetic-qualification/trial-0001');
  assert.equal(prepared[559].trialId, 'synthetic-qualification/trial-0560');
  assert.deepEqual(
    prepared.slice(0, 8).map(t => t.metadata.condition),
    [
      'pack',
      'exhaustive_text',
      'canonical_prose',
      'no_documentation',
      'exhaustive_text',
      'canonical_prose',
      'no_documentation',
      'pack',
    ],
  );
  for (const condition of plan.conditions)
    assert.equal(prepared.filter(t => t.metadata.condition === condition).length, 140);
  const text = new TextDecoder().decode(prepared[0].promptBytes);
  assert(text.includes(new TextDecoder().decode(documentation.fr.pack)));
  assert(!text.includes('synthetic-qualification'));
  const casePayload = JSON.parse(text.split('<case>')[1].split('</case>')[0]);
  assert.deepEqual(Object.keys(casePayload), ['evidence', 'question']);
  assert.deepEqual(casePayload.evidence, scenarios.cases[0].evidence);
});

test('new preparation rejects silent Unicode and JSON loss as well as malformed UTF-8', () => {
  assert.throws(
    () => preparePilotTrials({...input, configurationId: /** @type {any} */ (undefined)}),
    /configuration_id/,
  );
  const badPlan = structuredClone(plan);
  badPlan.instructions.fr = '\ud800';
  assert.throws(() => preparePilotTrials({...input, plan: badPlan}), /pilot_instruction/);
  const badScenarios = structuredClone(scenarios);
  badScenarios.cases[0].evidence = undefined;
  assert.throws(() => preparePilotTrials({...input, scenarios: badScenarios}), /invalid_json_value/);
  const badDocuments = structuredClone(documentation);
  badDocuments.fr.pack = Uint8Array.of(0xff);
  assert.throws(() => preparePilotTrials({...input, documentation: badDocuments}), /encoded data|encoding/i);
});

test('an empty-message error survives the exported journal and retries after the initial pass', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gcr-pilot-execution-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const path = join(directory, 'attempts.jsonl');
  const trials = prepared.slice(0, 3);
  let calls = 0;
  const result = await executePilotTrials({
    trials,
    mode: 'synthetic',
    beforeAttempt: discard,
    journal: event => appendFile(path, JSON.stringify(event) + '\n'),
    send: async request => {
      assert.deepEqual(Object.keys(request).sort(), ['instruction', 'outputTokenLimit', 'promptBytes', 'signal']);
      if (++calls === 1) throw new PilotTechnicalError('', {retryable: true, code: 'temporary'});
      return response('réponse achevée');
    },
  });
  const events = (await readFile(path, 'utf8'))
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
  const completed = events.filter(event => event.event === 'attempt_finished');
  assert.deepEqual(
    completed.map(event => [event.trialId, event.attemptNumber]),
    [
      [trials[0].trialId, 1],
      [trials[1].trialId, 1],
      [trials[2].trialId, 1],
      [trials[0].trialId, 2],
    ],
  );
  assert.equal(completed[0].outcome.error.message, '');
  assert.equal(completed[0].outcome.kind, 'technical_error');
  assert.equal(completed[0].outcome.judgment, null);
  assert.equal(result.state, 'COMPLETED');
  assert.equal(result.counts.technicalErrors, 1);
  assert.equal(result.counts.attempts, 4);
  assert.equal(result.counts.completed, 3);
});

test('empty, white, zero-width, refusal and truncated completed responses are never retried', async () => {
  const responses = [
    response(''),
    response(' \u00a0\ufeff\n'),
    response('\u200b'),
    response('Je refuse.', {refusal: 'Je refuse.'}),
    response('Fragment incomplet', {finishReason: 'length', outputLimited: true}),
  ];
  let calls = 0;
  const result = await executePilotTrials({
    trials: prepared.slice(0, 5),
    mode: 'synthetic',
    beforeAttempt: discard,
    journal: discard,
    send: async () => responses[calls++],
  });
  assert.equal(calls, 5);
  assert.equal(result.counts.completedEmpty, 2);
  assert.equal(result.counts.outputLimited, 1);
  assert.equal(result.counts.technicalErrors, 0);
  assert.equal(result.counts.evaluable, null);
  assert.equal(result.counts.notEvaluable, null);
  assert.deepEqual(
    result.attempts.map(item => item.outcome.judgment),
    [null, null, null, null, null],
  );
  assert.deepEqual(
    result.attempts.map(item => (item.outcome.kind === 'completed_response' ? item.outcome.rawText : null)),
    responses.map(item => item.rawText),
  );
});

test('two transient failures exhaust the same trial and preserve both partial traces', async () => {
  let calls = 0;
  const result = await executePilotTrials({
    trials: prepared.slice(0, 1),
    mode: 'synthetic',
    beforeAttempt: discard,
    journal: discard,
    send: async () => {
      throw new PilotTechnicalError('interrupted', {
        retryable: true,
        partialResponse: `fragment-${++calls}`,
        deliveryState: 'response_incomplete',
      });
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.state, 'COMPLETED_WITH_TECHNICAL_ERRORS');
  assert.equal(result.counts.received, 0);
  assert.equal(result.counts.technicalOnly, 1);
  assert.equal(result.counts.technicalErrors, 2);
  assert.deepEqual(
    result.attempts.map(a => (a.outcome.kind === 'technical_error' ? a.outcome.error.partialResponse : null)),
    ['fragment-1', 'fragment-2'],
  );
});

test('unclassified exceptions and permanent provider failures do not create automatic retries', async () => {
  let calls = 0;
  const result = await executePilotTrials({
    trials: prepared.slice(0, 1),
    mode: 'synthetic',
    beforeAttempt: discard,
    journal: discard,
    send: async () => {
      calls++;
      throw new Error('');
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.counts.technicalErrors, 1);
  assert.equal(result.attempts[0].outcome.judgment, null);
});

test('durable journal failure stops the run and does not relabel the provider failure', async () => {
  let calls = 0;
  /** @type {any[]} */ const attemptedWrites = [];
  await assert.rejects(
    executePilotTrials({
      trials: prepared.slice(0, 2),
      mode: 'synthetic',
      beforeAttempt: discard,
      journal: async event => {
        attemptedWrites.push(structuredClone(event));
        if (event.event === 'attempt_finished') throw new Error('disk_full');
      },
      send: async () => {
        calls++;
        throw new PilotTechnicalError('', {retryable: true});
      },
    }),
    /disk_full/,
  );
  assert.equal(calls, 1);
  assert.equal(attemptedWrites.at(-1).outcome.kind, 'technical_error');
  assert.equal(attemptedWrites.at(-1).outcome.error.message, '');
  assert(!attemptedWrites.some(event => event.event === 'run_finished'));
});

test('a refused budget admission sends nothing and is not a failed provider attempt', async () => {
  let calls = 0;
  /** @type {any[]} */ const events = [];
  await assert.rejects(
    executePilotTrials({
      trials: prepared.slice(0, 1),
      mode: 'synthetic',
      beforeAttempt: async () => {
        throw new Error('budget_exhausted');
      },
      journal: async event => {
        events.push(event);
      },
      send: async () => {
        calls++;
        return response('impossible');
      },
    }),
    /budget_exhausted/,
  );
  assert.equal(calls, 0);
  assert.deepEqual(
    events.map(event => event.event),
    ['run_started'],
  );
});

test('cancellation retains the completed response and leaves later trials not attempted', async () => {
  const controller = new AbortController();
  const result = await executePilotTrials({
    trials: prepared.slice(0, 2),
    mode: 'synthetic',
    signal: controller.signal,
    beforeAttempt: discard,
    journal: discard,
    send: async () => {
      controller.abort();
      return response('conservée');
    },
  });
  assert.equal(result.state, 'STOPPED');
  assert.equal(result.counts.completed, 1);
  assert.equal(result.counts.notAttempted, 1);
});

test('accounting refuses an extra attempt after a completed response', async () => {
  const trials = prepared.slice(0, 1);
  const result = await executePilotTrials({
    trials,
    mode: 'synthetic',
    beforeAttempt: discard,
    journal: discard,
    send: async () => response(''),
  });
  assert.throws(
    () => accountPilotAttempts([trials[0].trialId], [...result.attempts, {...result.attempts[0], attemptNumber: 2}]),
    /retry_ineligible/,
  );
  assert.throws(
    () => accountPilotAttempts([trials[0].trialId], [result.attempts[0], result.attempts[0]]),
    /attempt_order/,
  );
});
