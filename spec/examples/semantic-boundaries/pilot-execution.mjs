// SPDX-License-Identifier: Apache-2.0
// Execution accounting shared by local qualification and an explicitly configured runner.
// This module contains no credentials, network transport, storage or semantic judge.
import {assemblePilotPrompt} from './assemble-prompt.mjs';

function requireValue(condition, code) {
  if (!condition) throw new TypeError(code);
}

function assertJson(value, seen = new Set()) {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    requireValue(value.isWellFormed(), 'invalid_unicode');
    return;
  }
  if (typeof value === 'number') {
    requireValue(Number.isFinite(value), 'invalid_json_number');
    return;
  }
  requireValue(value && typeof value === 'object' && !seen.has(value), 'invalid_json_value');
  requireValue(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, 'invalid_json_object');
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      requireValue(Object.hasOwn(value, i), 'sparse_json_array');
      assertJson(value[i], seen);
    }
  } else {
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      requireValue(key.isWellFormed() && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'invalid_json_property');
      assertJson(descriptor.value, seen);
    }
  }
  seen.delete(value);
}

/** Prepare the frozen 560-trial order; condition and identity remain outside the prompt. */
export function preparePilotTrials({plan, scenarios, documentation, configurationId}) {
  requireValue(typeof configurationId === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(configurationId), 'configuration_id');
  requireValue(plan.protocolVersion === 'four-condition-pilot-3', 'pilot_protocol');
  requireValue(JSON.stringify(plan.languages) === '["fr","en"]', 'pilot_languages');
  requireValue(JSON.stringify(plan.conditions) === '["pack","exhaustive_text","canonical_prose","no_documentation"]', 'pilot_conditions');
  requireValue(plan.cases.length === 7 && new Set(plan.cases).size === 7 && plan.repetitions === 10, 'pilot_design');
  requireValue(plan.expectedResponsesPerConfiguration === 560 && plan.outputTokenLimit === 512, 'pilot_limits');
  const trials = [];
  for (const [c, caseId] of plan.cases.entries()) {
    const matches = scenarios.cases.filter(item => item.id === caseId);
    requireValue(matches.length === 1, 'pilot_case_identity');
    const scenario = matches[0];
    assertJson(scenario.evidence);
    for (const [l, language] of plan.languages.entries()) {
      const instruction = plan.instructions[language];
      const question = scenario[language]?.question;
      requireValue(typeof instruction === 'string' && instruction.isWellFormed(), 'pilot_instruction');
      requireValue(typeof question === 'string' && question.isWellFormed(), 'pilot_question');
      for (let repetition = 0; repetition < 10; repetition++) {
        const rotation = (c + 2 * l + repetition) % 4;
        for (let position = 0; position < 4; position++) {
          const condition = plan.conditions[(position + rotation) % 4];
          const bytes = condition === 'no_documentation' ? new Uint8Array() : documentation[language]?.[condition];
          requireValue(bytes instanceof Uint8Array, 'pilot_documentation');
          const promptBytes = assemblePilotPrompt({instruction, documentationBytes: bytes, scenario, language});
          trials.push({
            trialId: `${configurationId}/trial-${String(trials.length + 1).padStart(4, '0')}`,
            metadata: {caseId, language, repetition, condition, blockIndex: (c * 2 + l) * 10 + repetition, position},
            instruction,
            promptBytes,
            outputTokenLimit: 512,
          });
        }
      }
    }
  }
  return trials;
}

/** Only a transport may identify an eligible pre-completion transient failure. */
export class PilotTechnicalError extends Error {
  constructor(message, {code = 'transport_error', retryable = false, partialResponse = null, deliveryState = 'unknown'} = {}) {
    super(message);
    this.name = 'PilotTechnicalError';
    this.code = code;
    this.retryable = retryable;
    this.partialResponse = partialResponse;
    this.deliveryState = deliveryState;
  }
}

/** Storage/admission failures stop execution; they are not provider observations. */
export class PilotExecutionStopped extends Error {}

function technicalOutcome(error) {
  return {
    kind: 'technical_error',
    completed: false,
    error: {
      name: error instanceof Error ? error.name : 'ThrownValue',
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof PilotTechnicalError ? error.code : 'unclassified_error',
      retryable: error instanceof PilotTechnicalError && error.retryable === true,
      partialResponse: error instanceof PilotTechnicalError ? error.partialResponse : null,
      partialResponseBase64: error instanceof PilotTechnicalError ? error.partialResponseBase64 ?? null : null,
      requestSha256: error instanceof PilotTechnicalError ? error.requestSha256 ?? null : null,
      responseSha256: error instanceof PilotTechnicalError ? error.responseSha256 ?? null : null,
      deliveryState: error instanceof PilotTechnicalError ? error.deliveryState : 'unknown',
    },
    judgment: null,
  };
}

function completedOutcome(response) {
  requireValue(response && typeof response.rawText === 'string' && typeof response.finishReason === 'string', 'transport_completed_contract');
  requireValue(typeof response.rawBody === 'string', 'transport_raw_body_required');
  return {
    kind: 'completed_response',
    completed: true,
    rawText: response.rawText,
    rawBody: response.rawBody,
    requestSha256: response.requestSha256 ?? null,
    responseSha256: response.responseSha256 ?? null,
    finishReason: response.finishReason,
    providerResponseId: response.providerResponseId ?? null,
    model: response.model ?? null,
    usage: response.usage ?? null,
    refusal: response.refusal ?? null,
    emptyAfterTrim: response.rawText.trim().length === 0,
    outputLimited: response.outputLimited === true,
    // Semantic labels require the prespecified rubric and real evaluator records.
    judgment: null,
  };
}

/** Count trials and attempts separately; semantic denominators stay pending until judging. */
export function accountPilotAttempts(trialIds, attempts) {
  requireValue(new Set(trialIds).size === trialIds.length, 'duplicate_trial');
  const allowed = new Set(trialIds);
  const byTrial = new Map();
  let technicalErrors = 0;
  for (const attempt of attempts) {
    requireValue(allowed.has(attempt.trialId) && [1, 2].includes(attempt.attemptNumber), 'attempt_identity');
    const previous = byTrial.get(attempt.trialId) ?? [];
    requireValue(attempt.attemptNumber === previous.length + 1, 'attempt_order');
    if (previous.length) requireValue(previous[0].outcome.kind === 'technical_error' && previous[0].outcome.error.retryable === true, 'retry_ineligible');
    requireValue(['completed_response', 'technical_error'].includes(attempt.outcome.kind), 'attempt_outcome');
    previous.push(attempt);
    byTrial.set(attempt.trialId, previous);
    if (attempt.outcome.kind === 'technical_error') technicalErrors++;
  }
  const primaryResponses = [...byTrial.values()].flatMap(items => {
    const completed = items.find(item => item.outcome.kind === 'completed_response');
    return completed ? [completed] : [];
  });
  return {
    expected: trialIds.length,
    attempted: byTrial.size,
    attempts: attempts.length,
    received: primaryResponses.length,
    completed: primaryResponses.length,
    technicalErrors,
    technicalOnly: byTrial.size - primaryResponses.length,
    notAttempted: trialIds.length - byTrial.size,
    completedEmpty: primaryResponses.filter(item => item.outcome.emptyAfterTrim).length,
    outputLimited: primaryResponses.filter(item => item.outcome.outputLimited).length,
    evaluable: null,
    notEvaluable: null,
    judgmentsPending: primaryResponses.length,
  };
}

/**
 * Execute one planned pass and one eligible retry pass. Journal failures stop execution;
 * they never turn a failed provider task into a success or invite an unrecorded retry.
 * beforeAttempt is the durable admission/budget gate; journal must persist before resolving.
 */
export async function executePilotTrials({trials, send, journal, beforeAttempt, afterAttempt, signal, mode}) {
  requireValue(['synthetic', 'provider'].includes(mode), 'execution_mode');
  requireValue(typeof send === 'function' && typeof journal === 'function' && typeof beforeAttempt === 'function', 'execution_dependencies');
  requireValue(trials.length > 0 && trials.length <= 560, 'trial_count');
  for (const trial of trials) {
    requireValue(typeof trial.trialId === 'string' && trial.trialId.length > 0, 'trial_identity');
    requireValue(trial.promptBytes instanceof Uint8Array && trial.outputTokenLimit === 512, 'trial_input_contract');
    requireValue(typeof trial.instruction === 'string' && trial.instruction.isWellFormed(), 'trial_instruction');
    new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(trial.promptBytes);
  }
  const trialIds = trials.map(trial => trial.trialId);
  requireValue(new Set(trialIds).size === trials.length, 'duplicate_trial');
  const attempts = [];
  const retryQueue = [];
  let stopped = false;
  await journal({event: 'run_started', mode, expected: trials.length});
  const execute = async (trial, attemptNumber) => {
    if (signal?.aborted) { stopped = true; return; }
    // Do not catch admission/storage errors as if they were provider errors.
    await beforeAttempt({trial, attemptNumber});
    await journal({event: 'attempt_started', mode, trialId: trial.trialId, attemptNumber, metadata: {...trial.metadata}});
    let outcome;
    try {
      // A transport gets only prompt bytes and the output ceiling, never rubric/condition data.
      const response = await send({promptBytes: new Uint8Array(trial.promptBytes), instruction: trial.instruction, outputTokenLimit: trial.outputTokenLimit, signal});
      outcome = completedOutcome(response);
    } catch (error) {
      if (error instanceof PilotExecutionStopped) throw error;
      outcome = technicalOutcome(error);
    }
    const attempt = {trialId: trial.trialId, attemptNumber, outcome};
    await journal({event: 'attempt_finished', mode, ...attempt});
    if (afterAttempt) await afterAttempt({trial, attempt});
    attempts.push(attempt);
    if (attemptNumber === 1 && attempt.outcome.kind === 'technical_error' && attempt.outcome.error.retryable) retryQueue.push(trial);
  };
  for (const trial of trials) { await execute(trial, 1); if (stopped) break; }
  if (!stopped) for (const trial of retryQueue) { await execute(trial, 2); if (stopped) break; }
  const counts = accountPilotAttempts(trialIds, attempts);
  const result = {mode, state: stopped ? 'STOPPED' : counts.completed === counts.expected ? 'COMPLETED' : 'COMPLETED_WITH_TECHNICAL_ERRORS', counts, attempts};
  await journal({event: 'run_finished', mode, state: result.state, counts});
  return result;
}
