// Offline verification and descriptive analysis of retained records, never execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadCampaign} from '../spec/examples/semantic-boundaries/pilot-campaign.mjs';
import {buildProviderRequest, decodeProviderResponse} from '../spec/examples/semantic-boundaries/pilot-provider.mjs';
import {accountPilotAttempts} from '../spec/examples/semantic-boundaries/pilot-execution.mjs';
import {
  JUDGE_INSTRUCTION,
  prepareJudgeInput,
  validateJudgeResponse,
  summarizeJudgments,
} from '../spec/examples/semantic-boundaries/pilot-judging.mjs';
import {terminalValues} from '../spec/examples/semantic-boundaries/generate.mjs';

/** @typedef {{key: string, bytes: number, sha256: string}} ArchivePin */
/** @typedef {Record<string, any> & {annotations: {reviewerId: string, utility: string}[]}} DataRow */
/** @typedef {import('../spec/examples/semantic-boundaries/pilot-execution.mjs').Trial} Trial */
/** @typedef {import('../spec/examples/semantic-boundaries/pilot-judging.mjs').JudgeRecord} JudgeRecord */
/** @param {string | Uint8Array} value */
export const sha256 = value => createHash('sha256').update(value).digest('hex');
/** @param {unknown} value */
const clone = value => JSON.parse(JSON.stringify(value));
const enc = new TextEncoder();
const campaignId = 'gcr-pilot-20261107';
const manifestSha256 = '14f54dce16262df4be5f995d47b9edaaca1af21930389638902f22869d2f8ad3';
const archiveProofSha256 = 'f663766d53f76e3881b288f4d8a1935df3a357c6f70eaa3f4fbfa6b77c434102';
const planReceiptSha256 = '06c4173e307dc30c332281a4e43cfa56bfe85158101042331a5a91e332334024';
const prefix = `campaigns/${campaignId}/`;
const reviewers = ['deepinfra', 'mistral'];
const conditions = ['pack', 'exhaustive_text', 'canonical_prose', 'no_documentation'];

export const fictionLexicon = [
  'fictif',
  'fictive',
  'fictifs',
  'fictives',
  'fiction',
  'fictionnel',
  'fictionnelle',
  'fictionnels',
  'fictionnelles',
  'exercice',
  'exercices',
  'fictional',
  'exercise',
  'exercises',
];
/** A lexical signal is not a psychological effect. Technical identifiers are separate. */
/** @param {unknown} value */
export function fictionSignals(value) {
  let readableOccurrences = 0,
    technicalOccurrences = 0;
  const lexicon = new Set(fictionLexicon);
  /** @param {string} text @param {boolean} technical */
  const scan = (text, technical = false) => {
    const normalized = text.normalize('NFC').toLowerCase();
    for (const match of normalized.matchAll(/\p{L}+/gu)) {
      if (!lexicon.has(match[0])) continue;
      const before = normalized[match.index - 1] ?? '';
      const after = normalized[match.index + match[0].length] ?? '';
      const joinedIdentifier =
        /[-_/@]/u.test(before + after) ||
        (/[.:]/u.test(before) && /[\p{L}\p{N}]/u.test(normalized[match.index - 2] ?? '')) ||
        (/[.:]/u.test(after) && /[\p{L}\p{N}]/u.test(normalized[match.index + match[0].length + 1] ?? ''));
      if (technical || joinedIdentifier) technicalOccurrences++;
      else readableOccurrences++;
    }
  };
  /** @param {unknown} item */
  const walk = item => {
    if (typeof item === 'string') scan(item);
    else if (Array.isArray(item)) item.forEach(walk);
    else if (item && typeof item === 'object')
      for (const [key, val] of Object.entries(item)) {
        scan(key, true);
        walk(val);
      }
  };
  walk(value);
  return {readableOccurrences, technicalOccurrences, readablePresent: readableOccurrences > 0};
}

/** Every consumed cache byte must match the dated inventory, including envelopes. */
/** @param {string} cacheDirectory @param {ArchivePin[]} pins */
export function createOfflineArchive(cacheDirectory, pins) {
  const index = new Map(pins.map(pin => [pin.key, pin]));
  assert.equal(index.size, pins.length, 'duplicate_archive_pin');
  /** @type {Map<string, ArchivePin & {visibility: string}>} */
  const consumed = new Map();
  /** @param {string} key */
  async function bytes(key) {
    assert(key.startsWith(prefix) && !key.includes('..'), 'archive_scope');
    const pin = index.get(key);
    assert(pin, 'unlisted_archive_object');
    const value = await readFile(resolve(cacheDirectory, sha256(key) + '.json'));
    assert.equal(value.length, pin.bytes, 'archive_size');
    assert.equal(sha256(value), pin.sha256, 'archive_digest');
    consumed.set(key, {key, bytes: value.length, sha256: pin.sha256, visibility: 'private-retained-evidence'});
    return value;
  }
  /** @param {string} key */
  async function record(key) {
    const value = JSON.parse((await bytes(key)).toString('utf8'));
    assert.equal(value.schema, 'runtime-pilot-record/1', 'record_schema');
    assert.equal(sha256(JSON.stringify(value.payload)), value.sha256, 'record_digest');
    return value;
  }
  /** @param {...unknown} _args */
  const forbidden = (..._args) => {
    throw new Error('offline_archive_is_read_only');
  };
  return {
    bytes,
    record,
    consumed,
    bucket: {
      get: async (/** @type {string} */ key) => {
        const b = await bytes(key);
        return {
          etag: sha256(b),
          size: b.length,
          text: async () => b.toString('utf8'),
          arrayBuffer: async () => Uint8Array.from(b).buffer,
        };
      },
      put: forbidden,
      delete: forbidden,
    },
  };
}

/** @param {DataRow[]} rows @param {string[]} fields */
export function executionTable(rows, fields) {
  const groups = new Map();
  for (const row of rows) {
    const identity = Object.fromEntries(fields.map(field => [field, row[field]]));
    const key = JSON.stringify(identity);
    const out = groups.get(key) ?? {
      ...identity,
      planned: 0,
      received: 0,
      outputLimited: 0,
      notOutputLimited: 0,
      empty: 0,
      paired: 0,
      single: 0,
      unjudged: 0,
      acceptedJudgments: 0,
      availableJudgmentAttempts: 0,
    };
    out.planned++;
    out.received += Number(row.received);
    out.outputLimited += Number(row.outputLimited === true);
    out.notOutputLimited += Number(row.outputLimited === false);
    out.empty += Number(row.emptyAfterTrim === true);
    out.paired += Number(row.acceptedJudgments === 2);
    out.single += Number(row.acceptedJudgments === 1);
    out.unjudged += Number(row.acceptedJudgments === 0);
    out.acceptedJudgments += row.acceptedJudgments;
    out.availableJudgmentAttempts += row.availableJudgmentAttempts;
    groups.set(key, out);
  }
  return [...groups.values()];
}

/** @param {Record<string, any>[]} descriptive @param {string[]} fields @param {{cases: {id: string, applicability: Record<string, Record<string, string>>}[]}} rubric */
function criterionTable(descriptive, fields, rubric) {
  const groups = new Map();
  for (const row of descriptive) {
    const identity = Object.fromEntries(fields.map(field => [field, row[field]]));
    const key = JSON.stringify(identity);
    const out = groups.get(key) ?? {
      ...identity,
      expected: 0,
      missing: 0,
      notReceived: 0,
      applicableExpected: 0,
      notApplicableExpected: 0,
      missingApplicable: 0,
      PASS: 0,
      FAIL: 0,
      UNSCORABLE: 0,
      NOT_APPLICABLE: 0,
    };
    const rubricCase = rubric.cases.find(item => item.id === row.caseId);
    assert(rubricCase, 'rubric_case');
    const applicable = rubricCase.applicability[row.condition][row.dimension] === 'APPLICABLE';
    out[applicable ? 'applicableExpected' : 'notApplicableExpected'] += row.expected;
    if (applicable) out.missingApplicable += row.missing;
    for (const name of ['expected', 'missing', 'notReceived']) out[name] += row[name];
    for (const name of ['PASS', 'FAIL', 'UNSCORABLE', 'NOT_APPLICABLE']) out[name] += row.counts[name];
    groups.set(key, out);
  }
  return [...groups.values()].map(row => ({
    ...row,
    accepted: row.PASS + row.FAIL + row.UNSCORABLE + row.NOT_APPLICABLE,
    evaluable: row.PASS + row.FAIL,
    applicableAccepted: row.PASS + row.FAIL + row.UNSCORABLE,
  }));
}

/** @param {DataRow[]} rows @param {string[]} fields */
function utilityTable(rows, fields) {
  const groups = new Map();
  for (const row of rows)
    for (const reviewerId of reviewers) {
      const identity = {...Object.fromEntries(fields.map(field => [field, row[field]])), reviewerId};
      const key = JSON.stringify(identity);
      const out = groups.get(key) ?? {...identity, expected: 0, missing: 0, RESOLVED: 0, PARTIAL: 0, UNDETERMINED: 0};
      out.expected++;
      const annotation = row.annotations.find(a => a.reviewerId === reviewerId);
      if (annotation) out[annotation.utility]++;
      else out.missing++;
      groups.set(key, out);
    }
  return [...groups.values()];
}

/** @param {DataRow[]} rows */
function matchedBlocks(rows) {
  /** @type {Map<string, DataRow[]>} */
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.configurationId}/${row.caseId}/${row.language}/${row.repetition}`;
    const group = groups.get(key) ?? [];
    assert(!group.some(x => x.condition === row.condition), 'duplicate_block_condition');
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([block, items]) => ({
    block,
    conditionsPresent: items.map(x => x.condition),
    allFourReceived: items.length === 4 && items.every(x => x.received),
    allFourNotOutputLimited: items.length === 4 && items.every(x => x.outputLimited === false),
    allFourPaired: items.length === 4 && items.every(x => x.paired),
    allFourNotOutputLimitedAndPaired: items.length === 4 && items.every(x => x.outputLimited === false && x.paired),
    judges: Object.fromEntries(
      reviewers.map(id => [
        id,
        {
          allFourAccepted: items.length === 4 && items.every(x => x.annotations.some(a => a.reviewerId === id)),
          allFourNotOutputLimitedAndAccepted:
            items.length === 4 &&
            items.every(x => x.outputLimited === false && x.annotations.some(a => a.reviewerId === id)),
        },
      ]),
    ),
  }));
}

/** @param {import('../spec/examples/semantic-boundaries/pilot-provider.mjs').ProviderRequest} request @param {Trial} trial */
function framing(request, trial) {
  const body = JSON.parse(request.body);
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].role, 'user');
  assert(!Object.hasOwn(body, 'system'));
  const text = body.messages[0].content;
  assert.equal(text, new TextDecoder().decode(trial.promptBytes), 'archived_prompt_differs');
  const match = /^(.*)\n<documentation>\n([\s\S]*)\n<\/documentation>\n<case>([\s\S]*)<\/case>$/s.exec(text);
  assert(match, 'prompt_shape');
  const caseInput = JSON.parse(match[3]);
  assert.deepEqual(Object.keys(caseInput), ['evidence', 'question']);
  const document = trial.metadata.condition === 'pack' ? JSON.parse(match[2]) : match[2];
  return {
    source: 'archived-request-verified-against-pinned-assembler',
    instruction: fictionSignals(match[1]),
    documentation: fictionSignals(document),
    evidence: fictionSignals(caseInput.evidence),
    question: fictionSignals(caseInput.question),
    transmittedMetadata: null,
  };
}

/** @param {{cache: string, plan: string, proof: string, native: string}} options */
export async function analyzeRetainedPilot({cache, plan: planPath, proof: proofPath, native: nativePath}) {
  const proofBytes = await readFile(proofPath);
  assert.equal(sha256(proofBytes), archiveProofSha256, 'historical_inventory_pin');
  const planBytes = await readFile(planPath);
  assert.equal(sha256(planBytes), planReceiptSha256, 'historical_delivery_plan_pin');
  const proof = JSON.parse(proofBytes.toString('utf8')),
    plan = JSON.parse(planBytes.toString('utf8'));
  assert.equal(plan.campaignId, campaignId);
  assert.equal(plan.manifestSha256, manifestSha256);
  const archive = createOfflineArchive(cache, proof.objects);
  const campaign = await loadCampaign({
    bucket: archive.bucket,
    campaignId,
    manifestSha256,
    now: new Date(plan.originalAdmittedAt),
  });
  const comparability = [];
  for (const language of ['fr', 'en']) {
    const packBytes = await archive.bytes(prefix + `inputs/${language}.pack.json`);
    const pack = JSON.parse(packBytes.toString('utf8')),
      values = terminalValues(pack);
    const textBytes = await archive.bytes(prefix + `inputs/${language}.canonical-text.md`);
    const proseBytes = await archive.bytes(prefix + `inputs/${language}.canonical-prose.md`);
    const expectedText =
      values
        .map(({pointer, value}, i) => {
          const id = 'value-' + String(i + 1).padStart(3, '0');
          return language === 'fr'
            ? `[${id}] La propriété ${JSON.stringify(pointer)} déclare la valeur ${JSON.stringify(value)}.`
            : `[${id}] Property ${JSON.stringify(pointer)} declares the value ${JSON.stringify(value)}.`;
        })
        .join('\n\n') + '\n';
    assert.equal(textBytes.toString('utf8'), expectedText, 'exhaustive_text_all_terminal_values');
    comparability.push({
      language,
      packBytes: packBytes.length,
      exhaustiveTextBytes: textBytes.length,
      proseBytes: proseBytes.length,
      terminalValues: values.length,
      exhaustiveAllTerminalValuesExactlyReproduced: true,
      packTopLevelFields: Object.keys(pack),
      proseIsLossless: false,
      note: 'Prose is a separately authored account, not an exhaustive serialization; semantic coverage is reviewed in the dated record.',
    });
  }
  // This historical timestamp verifies admission records; it never authorizes execution now.
  const trials = campaign.trials,
    byShort = new Map(trials.map(trial => [trial.trialId.split('/').at(-1), trial]));
  assert.equal(byShort.size, 560, 'nominal_trial_identity');
  /** @type {import('../spec/examples/semantic-boundaries/pilot-execution.mjs').Attempt[]} */
  const attempts = [];
  const completed = new Map(),
    annotationRefs = new Map();
  /** @type {{trialId: string, reviewerId: string, attemptNumber: number, key: string, sha256: string}[]} */
  const judgeAttempts = [];
  /** @type {(typeof judgeAttempts[number] & {kind: string, code: string, validationReason?: string})[]} */
  const rejected = [];
  /** @type {JudgeRecord[]} */
  const annotations = [];
  const attemptPins = /** @type {ArchivePin[]} */ (proof.objects).filter(
    pin => pin.key.startsWith(prefix + 'attempts/respondent/') || pin.key.startsWith(prefix + 'attempts/judge/'),
  );
  const saved = new Map();
  for (const pin of attemptPins) {
    const envelope = await archive.record(pin.key),
      payload = envelope.payload;
    assert.equal(pin.key, prefix + 'attempts/' + payload.attemptId + '.json');
    assert.equal(payload.requestSha256, sha256(payload.request.body));
    if (payload.response) {
      const r = payload.response;
      assert.equal(sha256(r.rawBody), r.responseSha256);
      assert.equal(r.requestSha256, payload.requestSha256);
      assert.deepEqual(
        decodeProviderResponse(payload.request, r.rawBody),
        Object.fromEntries(Object.entries(r).filter(([key]) => !['requestSha256', 'responseSha256'].includes(key))),
        'raw_response_decode',
      );
    } else assert(payload.error, 'attempt_has_no_outcome');
    assert(!saved.has(payload.attemptId), 'duplicate_attempt');
    saved.set(payload.attemptId, {payload, pin, payloadSha256: envelope.sha256});
  }
  for (const [id, {payload: p}] of [...saved]
    .filter(([id]) => id.startsWith('respondent/'))
    .sort(([a], [b]) => a.localeCompare(b))) {
    const [, short, n] = id.split('/'),
      trial = byShort.get(short);
    assert(trial, 'unknown_trial');
    assert.deepEqual(
      p.request,
      buildProviderRequest({provider: 'anthropic', promptBytes: trial.promptBytes, outputTokenLimit: 512}),
    );
    const outcome = p.response
      ? {
          kind: /** @type {const} */ ('completed_response'),
          completed: /** @type {const} */ (true),
          judgment: null,
          ...p.response,
          emptyAfterTrim: p.response.rawText.trim().length === 0,
        }
      : {
          kind: /** @type {const} */ ('technical_error'),
          completed: /** @type {const} */ (false),
          judgment: null,
          error: p.error,
        };
    attempts.push({trialId: trial.trialId, attemptNumber: Number(n), outcome});
    if (p.response && !completed.has(trial.trialId)) completed.set(trial.trialId, {id, outcome, trial});
    const start = await archive.record(`${prefix}journal/${short}-${n}-attempt_started.json`);
    assert.deepEqual(start.payload, {
      event: 'attempt_started',
      mode: 'provider',
      trialId: trial.trialId,
      attemptNumber: Number(n),
      metadata: trial.metadata,
    });
    const end = await archive.record(`${prefix}journal/${short}-${n}-attempt_finished.json`);
    assert.equal(end.payload.trialId, trial.trialId);
    assert.equal(end.payload.attemptNumber, Number(n));
    assert.equal(end.payload.outcome.kind, outcome.kind);
    if (p.response)
      for (const key of ['rawText', 'rawBody', 'requestSha256', 'responseSha256', 'finishReason', 'outputLimited'])
        assert.deepEqual(end.payload.outcome[key], outcome[key]);
  }
  const responseCounts = accountPilotAttempts(
    trials.map(trial => trial.trialId),
    attempts,
  );
  for (const [id, {payload: p, pin}] of saved) {
    if (!id.startsWith('judge/')) continue;
    const [, short, reviewerId, n] = id.split('/'),
      trial = byShort.get(short),
      primary = completed.get(trial?.trialId);
    assert(trial && primary && reviewers.includes(reviewerId), 'judge_identity');
    const input = prepareJudgeInput({trial, outcome: primary.outcome, rubric: campaign.rubric});
    assert.deepEqual(
      p.request,
      buildProviderRequest({
        provider: /** @type {'deepinfra' | 'mistral'} */ (reviewerId),
        role: 'judge',
        promptBytes: enc.encode(JSON.stringify(input)),
        systemInstruction: JUDGE_INSTRUCTION,
        outputTokenLimit: 8192,
      }),
    );
    if (Number(n) === 2) {
      const prior = saved.get(`judge/${short}/${reviewerId}/1`);
      assert(prior?.payload.error?.retryable === true);
      assert.equal(prior.payload.request.body, p.request.body);
    } else assert.equal(Number(n), 1);
    const ref = {trialId: trial.trialId, reviewerId, attemptNumber: Number(n), key: pin.key, sha256: pin.sha256};
    judgeAttempts.push(ref);
    let annotation;
    try {
      if (p.error) {
        rejected.push({...ref, kind: 'technical_error', code: p.error.code});
        continue;
      }
      if (p.response.outputLimited) throw new TypeError('judge_output_limited');
      annotation = await validateJudgeResponse({
        rawText: p.response.rawText,
        input,
        trialId: trial.trialId,
        reviewerId,
      });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      rejected.push({
        ...ref,
        kind: 'rejected_judgment',
        code: 'judge_contract_rejected',
        validationReason: error.message,
      });
      continue;
    }
    const key = `${prefix}judgments/${short}/${reviewerId}.json`,
      archived = await archive.record(key);
    assert.equal(JSON.stringify(archived.payload), JSON.stringify(annotation), 'retained_annotation_exact');
    const pairKey = `${trial.trialId}/${reviewerId}`;
    assert(!annotationRefs.has(pairKey), 'duplicate_accepted_annotation');
    annotations.push(annotation);
    annotationRefs.set(pairKey, {key, sha256: archive.consumed.get(key)?.sha256, payloadSha256: archived.sha256});
  }
  const summary = summarizeJudgments({
    trials,
    completedTrialIds: [...completed.keys()],
    records: annotations,
    reviewerIds: reviewers,
    rubric: campaign.rubric,
  });
  const nativeBytes = await readFile(nativePath),
    native = JSON.parse(nativeBytes.toString('utf8')),
    historical = native.result;
  const finalPin = /** @type {ArchivePin[]} */ (proof.objects).find(pin => pin.key === prefix + 'result.json');
  assert(finalPin, 'historical_result_pin');
  const finalEnvelope = {
    schema: 'runtime-pilot-record/1',
    payload: historical,
    sha256: sha256(JSON.stringify(historical)),
  };
  assert.equal(finalEnvelope.sha256, proof.resultSha256, 'historical_result_payload');
  // The final result is retained in a dated receipt, not in the immutable object cache.
  assert.deepEqual(clone(summary), historical.judgments, 'historical_judgments_reconciliation');
  assert.deepEqual(
    {...responseCounts, judgmentsPending: completed.size - summary.pairedResponses},
    historical.responses,
    'historical_responses_reconciliation',
  );
  // Inventory order reflects concurrent reads, not experimental order. Compare identities.
  /** @param {{trialId: string, reviewerId: string, attemptNumber: number}} a @param {{trialId: string, reviewerId: string, attemptNumber: number}} b */
  const rejectionOrder = (a, b) =>
    `${a.trialId}/${a.reviewerId}/${a.attemptNumber}`.localeCompare(`${b.trialId}/${b.reviewerId}/${b.attemptNumber}`);
  assert.deepEqual(
    rejected
      .map(({trialId, reviewerId, attemptNumber, kind, code}) => ({trialId, reviewerId, attemptNumber, kind, code}))
      .sort(rejectionOrder),
    [...historical.rejectedJudgments].sort(rejectionOrder),
    'historical_rejections_reconciliation',
  );
  const rows = trials.map(trial => {
    const primary = completed.get(trial.trialId),
      savedAttempt = primary && saved.get(primary.id),
      r = primary?.outcome;
    const accepted = annotations
      .filter(a => a.trialId === trial.trialId)
      .map(a => ({
        reviewerId: a.reviewerId,
        dimensions: a.dimensions.map(({dimension, applicability, label}) => ({dimension, applicability, label})),
        utility: a.utility.category,
        reference: annotationRefs.get(`${trial.trialId}/${a.reviewerId}`),
      }));
    const judgeRefs = judgeAttempts.filter(a => a.trialId === trial.trialId);
    return {
      campaignId,
      configurationId: campaignId,
      trialId: trial.trialId,
      ...trial.metadata,
      selectedAttempt: primary?.id ?? null,
      received: !!primary,
      outcome: primary ? 'completed_response' : 'not_received',
      rawFinishReason: r?.finishReason ?? null,
      normalizedFinishReason: r?.outputLimited
        ? 'output_limit'
        : r?.refusal
          ? 'refusal'
          : r
            ? 'completed_without_output_limit_signal'
            : 'not_received',
      configuredOutputTokenLimit: 512,
      outputTokens: r?.usage?.outputTokens ?? null,
      outputLimited: r?.outputLimited ?? null,
      emptyAfterTrim: r?.emptyAfterTrim ?? null,
      requestedModel: savedAttempt?.payload.request.model ?? null,
      returnedModel: r?.model ?? null,
      expectedJudgments: 2,
      availableJudgmentAttempts: judgeRefs.length,
      acceptedJudgments: accepted.length,
      paired: accepted.length === 2,
      annotations: accepted,
      rejectedAttempts: rejected.filter(a => a.trialId === trial.trialId),
      judgeAttemptReferences: judgeRefs,
      responseReference: savedAttempt
        ? {
            key: savedAttempt.pin.key,
            sha256: savedAttempt.pin.sha256,
            payloadSha256: savedAttempt.payloadSha256,
            requestSha256: savedAttempt.payload.requestSha256,
            rawBodySha256: r.responseSha256,
            rawTextSha256: sha256(r.rawText),
          }
        : null,
      framing: savedAttempt ? framing(savedAttempt.payload.request, trial) : null,
    };
  });
  const byCaseLanguageCondition = executionTable(rows, ['caseId', 'language', 'condition']);
  assert.equal(byCaseLanguageCondition.length, 56);
  assert(
    byCaseLanguageCondition.every(row => row.planned === 10 && row.received === 10),
    'nominal_cells',
  );
  const stratified = [];
  for (const outputLimited of [true, false]) {
    const subset = rows.filter(row => row.outputLimited === outputLimited),
      ids = new Set(subset.map(row => row.trialId));
    const subSummary = summarizeJudgments({
      trials: trials.filter(trial => ids.has(trial.trialId)),
      completedTrialIds: [...ids],
      records: annotations.filter(a => ids.has(a.trialId)),
      reviewerIds: reviewers,
      rubric: campaign.rubric,
    });
    stratified.push({
      outputLimited,
      selection: 'post-generation descriptive subset, not a corrected whole-pilot estimate',
      execution: executionTable(subset, ['caseId', 'language', 'condition']),
      criteria: criterionTable(
        subSummary.descriptive,
        ['language', 'condition', 'dimension', 'reviewerId'],
        campaign.rubric,
      ),
      utility: utilityTable(subset, ['language', 'condition']),
      agreement: subSummary,
    });
  }
  const fiction = [];
  for (const group of byCaseLanguageCondition) {
    const items = rows.filter(
      row => row.caseId === group.caseId && row.language === group.language && row.condition === group.condition,
    );
    for (const field of /** @type {const} */ (['instruction', 'documentation', 'evidence', 'question']))
      fiction.push({
        caseId: group.caseId,
        language: group.language,
        condition: group.condition,
        field,
        responses: items.length,
        presentResponses: items.filter(row => row.framing?.[field].readablePresent).length,
        readableOccurrences: items.reduce((n, row) => n + (row.framing?.[field].readableOccurrences ?? 0), 0),
        technicalOccurrences: items.reduce((n, row) => n + (row.framing?.[field].technicalOccurrences ?? 0), 0),
      });
  }
  return {
    schema: 'retained-pilot-descriptive-analysis/1',
    analyzedAt: new Date().toISOString(),
    campaignId,
    manifestSha256,
    mode: 'offline-read-only',
    beforeArbitration: true,
    globalScore: null,
    provenance: {
      executedSourceCommit: '9605a80440e2df4c528ac38b7a507ed2b8926148',
      manifestSourceCommit: (await archive.record(prefix + 'manifest.json')).payload.sourceCommit,
      archiveProof: {sha256: sha256(proofBytes), at: proof.at},
      historicalResult: {
        payloadSha256: finalEnvelope.sha256,
        source: 'dated-native-receipt',
        receiptSha256: sha256(nativeBytes),
      },
      planReceiptSha256: sha256(planBytes),
      archiveInventoryObjects: proof.objects.length,
      historicalAdmissionTime: plan.originalAdmittedAt,
      consumedObjects: [...archive.consumed.values()],
      publicVisibility: 'code, aggregate tables and digests only; request/response/judge text remains private',
      redecoding:
        'new offline verification with modules checked byte-identical to executed commit; historical result unchanged',
    },
    protocol: {
      respondents: [...new Set(rows.map(row => row.requestedModel))],
      reviewers,
      configuredOutputTokenLimit: 512,
      primaryRule: 'first completed response, including empty, refusal and output-limited responses',
      noTools: true,
      messages: 'one user message; instruction + documentation + JSON evidence/question; no respondent system message',
      fictionLexicon,
      fictionMethod:
        'NFC, lowercase, Unicode letter tokens; JSON keys and identifier-connected tokens counted as technical (- _ / @, or . : joining letters/digits); sentence punctuation is not an identifier; JSON string values and prose counted separately; no metadata inferred from filenames',
      selection: 'all 560 planned slots; repeated attempts are not independent observations',
    },
    comparability,
    responses: historical.responses,
    judgments: summary,
    rejectedJudgments: rejected,
    rows,
    tables: {
      byCondition: executionTable(rows, ['condition']),
      byLanguageCondition: executionTable(rows, ['language', 'condition']),
      byCaseLanguageCondition,
      byFinishReason: executionTable(rows, ['language', 'condition', 'rawFinishReason']),
      criteria: criterionTable(
        summary.descriptive,
        ['language', 'condition', 'dimension', 'reviewerId'],
        campaign.rubric,
      ),
      utility: utilityTable(rows, ['language', 'condition']),
      stratified,
      fiction,
      matchedBlocks: matchedBlocks(rows),
    },
    limits: [
      'Seven synthetic cases are not a random representative sample of real tasks.',
      '127 non-output-limited responses remain subject to the configured 512-token ceiling and form a post-generation subset.',
      'Missing judgment pairs are not semantic failures; complete pairs are not established truth.',
      'Observed label concentration and incomplete pairs do not establish judge discrimination.',
      'Document form, content and fictional framing differ; counts cannot identify a causal framing effect.',
      'No model calls, new judgments, arbitration, significance tests, confidence intervals, global ranking or action-admission measurement.',
    ],
  };
}

/** Summarize existing agreement cells, without pooling or averaging kappa.
 * A criterion comparison and a response utility pair have different units.
 * @param {Record<string, any>} summary
 */
export function agreementOverview(summary) {
  const rows = [];
  /** @type {[string, Record<string, any>[]][]} */
  const groups = [
    ['criteria', summary.dimensions],
    ['utility', summary.utility],
  ];
  for (const [kind, cells] of groups) {
    for (const condition of conditions) {
      const selected = cells.filter(cell => cell.condition === condition);
      /** @type {Record<string, number>} */
      const reasons = {};
      for (const cell of selected) {
        if (cell.kappa === null) reasons[cell.undefinedReason] = (reasons[cell.undefinedReason] ?? 0) + 1;
      }
      rows.push({
        kind,
        condition,
        cells: selected.length,
        pairedComparisons: selected.reduce((n, cell) => n + cell.paired, 0),
        matchingComparisons: selected.reduce((n, cell) => n + cell.agreements, 0),
        undefinedKappa: selected.filter(cell => cell.kappa === null).length,
        zeroKappa: selected.filter(cell => cell.kappa === 0).length,
        positiveKappa: selected.filter(cell => cell.kappa !== null && cell.kappa > 0).length,
        undefinedReasons: reasons,
      });
    }
  }
  return rows;
}

/** The package JSON profile permits integer numbers only. Keep exact JS decimal
 * representations as strings for these three fractional statistics; private
 * historical computations retain their original numeric values.
 * @param {Record<string, any>[]} cells
 */
function publicAgreementCells(cells) {
  return cells.map(cell => ({
    ...cell,
    rawAgreement: cell.rawAgreement === null ? null : String(cell.rawAgreement),
    expectedAgreement: cell.expectedAgreement === null ? null : String(cell.expectedAgreement),
    kappa: cell.kappa === null ? null : String(cell.kappa),
  }));
}

/** A public projection contains only aggregates, never per-trial text or identifiers.
 * @param {Awaited<ReturnType<typeof analyzeRetainedPilot>>} result
 */
export function publicAggregates(result) {
  return {
    schema: 'retained-pilot-public-aggregates/1',
    campaignId: result.campaignId,
    analyzedDate: result.analyzedAt.slice(0, 10),
    beforeArbitration: true,
    globalScore: null,
    manifestSha256: result.manifestSha256,
    historicalResultPayloadSha256: result.provenance.historicalResult.payloadSha256,
    consumedObjects: result.provenance.consumedObjects.length,
    inventoryObjects: result.provenance.archiveInventoryObjects,
    evidenceVisibility: 'Private retained requests, responses and judgments; only aggregates are published.',
    responses: result.responses,
    judgmentCoverage: {
      expectedResponses: result.judgments.expectedResponses,
      pairedResponses: result.judgments.pairedResponses,
      missingPairs: result.judgments.missingPairs,
      acceptedAnnotations: result.judgments.acceptedAnnotations,
    },
    comparability: result.comparability,
    fictionLexicon: result.protocol.fictionLexicon,
    fictionMethod: result.protocol.fictionMethod,
    tables: {
      byCondition: result.tables.byCondition,
      byLanguageCondition: result.tables.byLanguageCondition,
      byCaseLanguageCondition: result.tables.byCaseLanguageCondition,
      byFinishReason: result.tables.byFinishReason,
      criteria: result.tables.criteria,
      utility: result.tables.utility,
      fiction: result.tables.fiction,
      agreement: {
        overview: agreementOverview(result.judgments),
        fractionalStatisticsEncoding:
          'rawAgreement, expectedAgreement and kappa are decimal strings or null; counts remain integers',
        dimensions: publicAgreementCells(result.judgments.dimensions),
        utility: publicAgreementCells(result.judgments.utility),
      },
      stratified: result.tables.stratified.map(stratum => ({
        outputLimited: stratum.outputLimited,
        selection: stratum.selection,
        execution: stratum.execution,
        criteria: stratum.criteria,
        utility: stratum.utility,
        agreement: {
          overview: agreementOverview(stratum.agreement),
          dimensions: publicAgreementCells(stratum.agreement.dimensions),
          utility: publicAgreementCells(stratum.agreement.utility),
        },
      })),
    },
    matchedBlocks: Object.fromEntries(
      /** @type {const} */ ([
        'allFourReceived',
        'allFourNotOutputLimited',
        'allFourPaired',
        'allFourNotOutputLimitedAndPaired',
      ]).map(key => [key, result.tables.matchedBlocks.filter(block => block[key]).length]),
    ),
    limitations: result.limits,
  };
}

/** @param {Awaited<ReturnType<typeof analyzeRetainedPilot>>} result */
export function renderRetainedAnalysis(result) {
  /** @param {Record<string, any>[]} rows @param {string[]} columns */
  const table = (rows, columns) =>
    '| ' +
    columns.join(' | ') +
    ' |\n| ' +
    columns.map(() => '---').join(' | ') +
    ' |\n' +
    rows
      .map(
        row => '| ' + columns.map(key => (row[key] === null ? 'indéfini' : String(row[key] ?? ''))).join(' | ') + ' |',
      )
      .join('\n');
  const blocks = result.tables.matchedBlocks;
  const total = result.responses.expected;
  const limited = result.responses.outputLimited;
  const notLimited = result.rows.filter(row => row.outputLimited === false);
  const atCeiling = notLimited.filter(row => row.outputTokens === result.protocol.configuredOutputTokenLimit).length;
  const agreementColumns = [
    'kind',
    'condition',
    'cells',
    'pairedComparisons',
    'matchingComparisons',
    'undefinedKappa',
    'zeroKappa',
    'positiveKappa',
  ];
  const overview = agreementOverview(result.judgments);
  return (
    [
      `# Analyse descriptive du pilote conservé, ${result.analyzedAt.slice(0, 10)}`,
      `Analyse hors ligne de ${result.responses.received}/${total} réponses. Empreintes vérifiées pour ${result.provenance.consumedObjects.length} objets effectivement lus, parmi ${result.provenance.archiveInventoryObjects} objets inventoriés. Les textes privés restent hors du dépôt public. Résultat historique réconcilié exactement, sans nouveaux jugements.`,
      '## Exécution et couverture',
      table(result.tables.byLanguageCondition, [
        'language',
        'condition',
        'received',
        'outputLimited',
        'notOutputLimited',
        'paired',
        'single',
        'unjudged',
      ]),
      `${limited}/${total} réponses portent le motif de limite de sortie; ${notLimited.length} ne le portent pas. Toutes avaient un plafond configuré de ${result.protocol.configuredOutputTokenLimit} jetons; ${atCeiling} réponses sans signal de limite comptent néanmoins exactement ce nombre de jetons. ${result.judgments.acceptedAnnotations}/${total * result.protocol.reviewers.length} annotations sont admises; ${result.judgments.pairedResponses}/${total} réponses ont une paire, ${result.judgments.missingPairs}/${total} n'en ont pas. Les ${result.rejectedJudgments.length} tentatives rejetées ne sont pas autant de réponses sans paire.`,
      '## Critères séparés, par juge',
      'Les effectifs PASS/FAIL/UNSCORABLE/NOT_APPLICABLE portent sur les annotations admises. La colonne missing reste affichée; evaluable vaut PASS + FAIL. Les critères et l’utilité ne sont pas fusionnés.',
      table(result.tables.criteria, [
        'language',
        'condition',
        'dimension',
        'reviewerId',
        'expected',
        'PASS',
        'FAIL',
        'UNSCORABLE',
        'NOT_APPLICABLE',
        'missing',
        'evaluable',
      ]),
      '## Utilité documentaire',
      table(result.tables.utility, [
        'language',
        'condition',
        'reviewerId',
        'expected',
        'RESOLVED',
        'PARTIAL',
        'UNDETERMINED',
        'missing',
      ]),
      '## Accord entre juges',
      'Chaque cellule de critère combine dimension, langue et condition; chaque cellule d’utilité combine cas, langue et condition. Une comparaison de critère porte sur une paire réponse/critère, une comparaison d’utilité sur une réponse. Les mêmes réponses participent à plusieurs critères; ces effectifs ne sont pas des observations indépendantes supplémentaires. Aucun kappa n’est moyenné ou recalculé sur une population regroupée.',
      table(overview, agreementColumns),
      `Sur ${overview.reduce((n, row) => n + row.cells, 0)} cellules, ${overview.reduce((n, row) => n + row.undefinedKappa, 0)} kappa sont indéfinis, ${overview.reduce((n, row) => n + row.zeroKappa, 0)} sont nuls et ${overview.reduce((n, row) => n + row.positiveKappa, 0)} sont positifs. Les motifs et les valeurs de chaque cellule sont détaillés ci-dessous. Un accord brut élevé dominé par une catégorie n’établit pas la capacité discriminante des juges. Cette capacité reste non établie; ni les paires complètes ni l’accord ne prouvent la vérité des jugements.`,
      table(result.judgments.dimensions, [
        'dimension',
        'language',
        'condition',
        'paired',
        'agreements',
        'rawAgreement',
        'kappa',
        'undefinedReason',
      ]),
      table(result.judgments.utility, [
        'caseId',
        'language',
        'condition',
        'paired',
        'agreements',
        'rawAgreement',
        'kappa',
        'undefinedReason',
      ]),
      '## Sous-groupes définis par le signal de limite',
      `Le sous-groupe de ${notLimited.length} réponses sans signal de limite est sélectionné après génération; il ne corrige pas l’estimation de l’ensemble. Parmi ${blocks.length} blocs de quatre conditions, ${blocks.filter(x => x.allFourNotOutputLimited).length} conservent quatre réponses sans signal de limite et ${blocks.filter(x => x.allFourNotOutputLimitedAndPaired).length} conservent aussi les quatre paires de jugements. Les JSON privé et public exposent les effectifs, critères, utilité et accords des deux strates.`,
      ...result.tables.stratified.flatMap(stratum => [
        `### Signal de limite de sortie : ${stratum.outputLimited ? 'présent' : 'absent'}`,
        table(agreementOverview(stratum.agreement), agreementColumns),
      ]),
      '## Cadrage fictionnel',
      'Lexique publié dans protocol.fictionLexicon. Normalisation NFC, minuscules, mots Unicode; clés JSON et racines dans les identifiants techniques sont comptées séparément. Chaque entrée a été lue dans la requête archivée et comparée à l’assembleur épinglé. Les champs instruction, documentation, evidence et question sont séparés; aucun nom de fichier ni métadonnée non transmise n’est ajouté. Les nombres ne mesurent pas un effet psychologique.',
      '## Reproductibilité et portée',
      'Le JSON public contient analyzedDate (jour UTC d’exécution) et le JSON privé analyzedAt (instant d’exécution). La reproduction des données est indépendante de ces métadonnées temporelles; l’égalité octet pour octet du JSON public exige le même jour UTC. Conserver les deux sorties et comparer les chemins de différence, sans réécrire une preuve antérieure.',
      'beforeArbitration reste true et globalScore reste null.',
      result.limits.map(limit => '- ' + limit).join('\n'),
    ].join('\n\n') + '\n'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // Assertion diffs could contain private provider text. Report only the named check.
  process.on('uncaughtException', error => {
    console.error(
      JSON.stringify({status: 'OFFLINE_ANALYSIS_FAILED', check: String(error.message).split('\n')[0].slice(0, 180)}),
    );
    process.exit(1);
  });
  const args = Object.fromEntries(
    process.argv.slice(2).map(arg => {
      const split = arg.indexOf('=');
      assert(split > 2 && arg.startsWith('--'), 'use_--name=value');
      return [arg.slice(2, split), arg.slice(split + 1)];
    }),
  );
  for (const name of ['cache', 'plan', 'proof', 'native', 'out']) assert(args[name], 'missing_' + name);
  assert(
    Object.keys(args).every(name => ['cache', 'plan', 'proof', 'native', 'out'].includes(name)),
    'unknown_argument',
  );
  globalThis.fetch = async () => {
    throw new Error('network_forbidden_in_offline_analysis');
  };
  const result = await analyzeRetainedPilot({
    cache: args.cache,
    plan: args.plan,
    proof: args.proof,
    native: args.native,
  });
  await writeFile(args.out + '.json', JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  await writeFile(args.out + '.md', renderRetainedAnalysis(result), {flag: 'wx'});
  await writeFile(args.out + '.aggregates.json', JSON.stringify(publicAggregates(result), null, 2) + '\n', {
    flag: 'wx',
  });
  console.log(
    JSON.stringify({
      status: 'OFFLINE_RECONCILED',
      consumedObjects: result.provenance.consumedObjects.length,
      responses: result.responses,
      acceptedAnnotations: result.judgments.acceptedAnnotations,
      pairedResponses: result.judgments.pairedResponses,
      output: args.out,
    }),
  );
}
