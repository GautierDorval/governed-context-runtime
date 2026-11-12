// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preparePilotTrials} from '../spec/examples/semantic-boundaries/pilot-execution.mjs';
import {
  prepareJudgeInput,
  validateJudgeResponse,
  summarizeJudgments,
  agreementTable,
} from '../spec/examples/semantic-boundaries/pilot-judging.mjs';
const source = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
const plan = JSON.parse(await readFile(new URL('experiment-plan.json', source), 'utf8'));
const scenarios = JSON.parse(await readFile(new URL('scenarios.json', source), 'utf8'));
const rubric = JSON.parse(await readFile(new URL('judging-rubric.json', source), 'utf8'));
/** @type {Record<string,Record<string,Uint8Array>>} */
const documentation = {};
for (const language of plan.languages) {
  documentation[language] = {};
  for (const condition of plan.conditions.filter(/** @param {string} c */ c => c !== 'no_documentation'))
    documentation[language][condition] = await readFile(new URL(plan.inputs[language][condition].path, source));
}
const trials = preparePilotTrials({plan, scenarios, documentation, configurationId: 'judging-test'});
/** @param {string} [rawText] @returns {import('../spec/examples/semantic-boundaries/pilot-execution.mjs').CompletedOutcome} */
const outcome = (rawText = 'Une réponse.') => ({
  kind: 'completed_response',
  completed: true,
  rawText,
  rawBody: '{}',
  model: 'synthetic',
  providerResponseId: 'synthetic',
  usage: null,
  refusal: null,
  finishReason: 'stop',
  outputLimited: false,
  emptyAfterTrim: !rawText.trim(),
  judgment: null,
});
/** @param {import('../spec/examples/semantic-boundaries/pilot-judging.mjs').JudgeInput} input */
function annotation(input) {
  const empty = !input.receivedResponse.trim();
  return {
    dimensions: Object.entries(input.rubric.applicability).map(([dimension, applicability]) => ({
      dimension,
      applicability,
      label: applicability === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : empty ? 'UNSCORABLE' : 'PASS',
      reason: 'Synthetic test reason.',
      responseExcerpt: input.receivedResponse,
    })),
    utility: {category: empty ? 'UNDETERMINED' : 'RESOLVED', reason: 'Synthetic test utility.'},
  };
}

test('judge receives original input and applicable rubric without condition, trial ID or peer opinion', () => {
  const input = prepareJudgeInput({trial: trials[0], outcome: outcome(), rubric});
  assert.equal(input.originalInput, new TextDecoder().decode(trials[0].promptBytes));
  assert(!JSON.stringify(input).includes('judging-test'));
  assert(!Object.hasOwn(input, 'condition'));
  assert(!Object.hasOwn(input, 'reviewer'));
  assert.deepEqual(input.rubric.applicability, rubric.cases[0].applicability.pack);
  const noDoc = trials.find(trial => trial.metadata.condition === 'no_documentation');
  assert(noDoc);
  const noDocInput = prepareJudgeInput({trial: noDoc, outcome: outcome(), rubric});
  assert.equal(noDocInput.rubric.expectation, rubric.cases[0].noDocumentationExpectation);
});

test('empty replies retain two real judge annotations and enforce empty precedence', async () => {
  const input = prepareJudgeInput({trial: trials[0], outcome: outcome(' \r\n'), rubric});
  const output = annotation(input);
  const accepted = await validateJudgeResponse({
    rawText: JSON.stringify(output),
    input,
    trialId: trials[0].trialId,
    reviewerId: 'judge-a',
  });
  assert.equal(accepted.status, 'accepted');
  const applies = output.dimensions.find(item => item.applicability === 'APPLICABLE');
  assert(applies);
  applies.label = 'PASS';
  await assert.rejects(
    validateJudgeResponse({rawText: JSON.stringify(output), input, trialId: trials[0].trialId, reviewerId: 'judge-a'}),
    /empty_precedence/,
  );
});

test('malformed, duplicate, invented-excerpt and applicability-changing judgments are rejected', async () => {
  const input = prepareJudgeInput({trial: trials[0], outcome: outcome(), rubric});
  for (const modify of [
    /** @param {ReturnType<typeof annotation>} value */ value => {
      value.dimensions[0].responseExcerpt = 'Not in response';
    },
    /** @param {ReturnType<typeof annotation>} value */ value => {
      value.dimensions[1] = value.dimensions[0];
    },
    /** @param {ReturnType<typeof annotation>} value */ value => {
      value.dimensions[0].applicability = 'NOT_APPLICABLE';
    },
    /** @param {ReturnType<typeof annotation>} value */ value => {
      value.dimensions[0].reason = '';
    },
  ]) {
    const output = annotation(input);
    modify(output);
    await assert.rejects(
      validateJudgeResponse({
        rawText: JSON.stringify(output),
        input,
        trialId: trials[0].trialId,
        reviewerId: 'judge-a',
      }),
    );
  }
  await assert.rejects(
    validateJudgeResponse({rawText: '{}', input, trialId: trials[0].trialId, reviewerId: 'judge-a'}),
  );
});

test('agreement is computed from the contingency table, preserving undefined kappa', () => {
  const table = agreementTable(
    [
      ['PASS', 'PASS'],
      ['PASS', 'PASS'],
      ['FAIL', 'PASS'],
      ['FAIL', 'FAIL'],
    ],
    ['PASS', 'FAIL'],
  );
  assert.deepEqual(table.contingency, [
    [2, 0],
    [1, 1],
  ]);
  assert.deepEqual(table.leftMargins, [2, 2]);
  assert.deepEqual(table.rightMargins, [3, 1]);
  assert.equal(table.rawAgreement, 0.75);
  assert.equal(table.expectedAgreement, 0.5);
  assert.equal(table.kappa, 0.5);
  const absent = agreementTable([], ['PASS', 'FAIL']);
  assert.equal(absent.undefinedReason, 'no_paired_data');
  assert.equal(absent.kappa, null);
  assert.equal(absent.rawAgreement, null);
  assert.equal(absent.expectedAgreement, null);
  const perfect = agreementTable([['PASS', 'PASS']], ['PASS', 'FAIL']);
  assert.equal(perfect.rawAgreement, 1);
  assert.equal(perfect.kappa, null);
  assert.equal(perfect.undefinedReason, 'expected_agreement_one');
});

test('missing judge outputs and nonapplicable dimensions are reported without imputation or pooling', async () => {
  const input = prepareJudgeInput({trial: trials[0], outcome: outcome(), rubric});
  const records = await Promise.all(
    ['judge-a', 'judge-b'].map(reviewerId =>
      validateJudgeResponse({
        rawText: JSON.stringify(annotation(input)),
        input,
        trialId: trials[0].trialId,
        reviewerId,
      }),
    ),
  );
  const report = summarizeJudgments({
    trials: trials.slice(0, 2),
    completedTrialIds: trials.slice(0, 2).map(trial => trial.trialId),
    records,
    reviewerIds: ['judge-a', 'judge-b'],
    rubric,
  });
  assert.equal(report.pairedResponses, 1);
  assert.equal(report.missingPairs, 1);
  assert.equal(report.globalScore, null);
  assert.equal(report.beforeArbitration, true);
  assert(report.dimensions.some(row => row.notApplicable === 1 && row.paired === 0));
  assert(report.dimensions.some(row => row.missing === 1 && row.paired === 0));
  assert.throws(
    () =>
      summarizeJudgments({
        trials,
        completedTrialIds: trials.map(trial => trial.trialId),
        records: [...records, records[0]],
        reviewerIds: ['judge-a', 'judge-b'],
        rubric,
      }),
    /duplicate_record/,
  );
});

test('technical-only trials are outside judgment denominators while unpaired received replies remain missing', async () => {
  const input = prepareJudgeInput({trial: trials[0], outcome: outcome(), rubric});
  const records = await Promise.all(
    ['judge-a', 'judge-b'].map(reviewerId =>
      validateJudgeResponse({
        rawText: JSON.stringify(annotation(input)),
        input,
        trialId: trials[0].trialId,
        reviewerId,
      }),
    ),
  );
  const args = {
    trials: trials.slice(0, 3),
    completedTrialIds: [trials[0].trialId, trials[2].trialId],
    records,
    reviewerIds: ['judge-a', 'judge-b'],
    rubric,
  };
  const report = summarizeJudgments(args);
  assert.equal(report.plannedResponses, 3);
  assert.equal(report.responsesNotReceived, 1);
  assert.equal(report.expectedResponses, 2);
  assert.equal(report.pairedResponses, 1);
  assert.equal(report.missingPairs, 1);
  for (const row of [...report.descriptive, ...report.dimensions, ...report.utility]) {
    assert.equal(row.planned, row.expected + row.notReceived);
  }
  for (const row of report.descriptive)
    assert.equal(
      row.expected,
      row.missing + Object.values(row.counts).reduce((sum, count) => Number(sum) + Number(count), 0),
    );
  assert(report.descriptive.some(row => row.notReceived === 1 && row.expected === 0 && row.missing === 0));
  assert.throws(() => summarizeJudgments({...args, completedTrialIds: [trials[2].trialId]}), /record_identity/);
});

test('hand-counted strata separate absent responses, missing annotations, unevaluable and nonapplicable labels', async () => {
  const selected = trials
    .filter(
      trial =>
        trial.metadata.caseId === 'preserve-conditions' &&
        trial.metadata.language === 'fr' &&
        trial.metadata.condition === 'pack',
    )
    .slice(0, 4);
  const other = trials.find(
    trial =>
      trial.metadata.caseId === 'preserve-conditions' &&
      trial.metadata.language === 'en' &&
      trial.metadata.condition === 'no_documentation',
  );
  assert.equal(selected.length, 4);
  assert(other);
  selected.push(other);
  // Hand-built oracle: FR/pack trial 3 has no response; trial 1 has no judge-b annotation.
  // The separate EN/no-documentation pair must never fill either missing FR observation.
  /** @type {[number, string, string, string][]} */
  const fixture = [
    [0, 'judge-a', 'PASS', 'RESOLVED'],
    [0, 'judge-b', 'FAIL', 'PARTIAL'],
    [1, 'judge-a', 'UNSCORABLE', 'UNDETERMINED'],
    [2, 'judge-a', 'FAIL', 'PARTIAL'],
    [2, 'judge-b', 'PASS', 'RESOLVED'],
    [4, 'judge-a', 'PASS', 'RESOLVED'],
    [4, 'judge-b', 'PASS', 'RESOLVED'],
  ];
  const records = [];
  for (const [index, reviewerId, label, category] of fixture) {
    const trial = selected[index];
    const input = prepareJudgeInput({trial, outcome: outcome(), rubric});
    const output = annotation(input);
    const dimension = output.dimensions.find(item => item.dimension === 'claim-justification');
    assert(dimension);
    dimension.label = label;
    output.utility.category = category;
    records.push(
      await validateJudgeResponse({rawText: JSON.stringify(output), input, trialId: trial.trialId, reviewerId}),
    );
  }
  const report = summarizeJudgments({
    trials: selected,
    completedTrialIds: [selected[0].trialId, selected[1].trialId, selected[2].trialId, selected[4].trialId],
    records,
    reviewerIds: ['judge-a', 'judge-b'],
    rubric,
  });
  assert.deepEqual(
    [
      report.plannedResponses,
      report.responsesNotReceived,
      report.expectedResponses,
      report.acceptedAnnotations,
      report.pairedResponses,
      report.missingPairs,
    ],
    [5, 1, 4, 7, 3, 1],
  );
  /** @param {any} row */
  const counts = row => {
    assert(row);
    const {planned, notReceived, expected, missing, counts, evaluable, notEvaluable} = row;
    return {planned, notReceived, expected, missing, counts, evaluable, notEvaluable};
  };
  /** @param {string} dimension @param {string} reviewerId */
  const french = (dimension, reviewerId) =>
    report.descriptive.find(
      row =>
        row.caseId === 'preserve-conditions' &&
        row.language === 'fr' &&
        row.condition === 'pack' &&
        row.dimension === dimension &&
        row.reviewerId === reviewerId,
    );
  assert.deepEqual(counts(french('claim-justification', 'judge-a')), {
    planned: 4,
    notReceived: 1,
    expected: 3,
    missing: 0,
    counts: {PASS: 1, FAIL: 1, UNSCORABLE: 1, NOT_APPLICABLE: 0},
    evaluable: 2,
    notEvaluable: 1,
  });
  assert.deepEqual(counts(french('claim-justification', 'judge-b')), {
    planned: 4,
    notReceived: 1,
    expected: 3,
    missing: 1,
    counts: {PASS: 1, FAIL: 1, UNSCORABLE: 0, NOT_APPLICABLE: 0},
    evaluable: 2,
    notEvaluable: 0,
  });
  assert.deepEqual(counts(french('unsupported-scope-extension', 'judge-a')), {
    planned: 4,
    notReceived: 1,
    expected: 3,
    missing: 0,
    counts: {PASS: 0, FAIL: 0, UNSCORABLE: 0, NOT_APPLICABLE: 3},
    evaluable: 0,
    notEvaluable: 0,
  });
  assert.deepEqual(counts(french('unsupported-scope-extension', 'judge-b')), {
    planned: 4,
    notReceived: 1,
    expected: 3,
    missing: 1,
    counts: {PASS: 0, FAIL: 0, UNSCORABLE: 0, NOT_APPLICABLE: 2},
    evaluable: 0,
    notEvaluable: 0,
  });
  for (const reviewerId of ['judge-a', 'judge-b']) {
    const english = report.descriptive.find(
      row =>
        row.language === 'en' &&
        row.condition === 'no_documentation' &&
        row.dimension === 'claim-justification' &&
        row.reviewerId === reviewerId,
    );
    assert.deepEqual(counts(english), {
      planned: 1,
      notReceived: 0,
      expected: 1,
      missing: 0,
      counts: {PASS: 1, FAIL: 0, UNSCORABLE: 0, NOT_APPLICABLE: 0},
      evaluable: 1,
      notEvaluable: 0,
    });
  }
  const dimension = report.dimensions.find(
    row => row.language === 'fr' && row.condition === 'pack' && row.dimension === 'claim-justification',
  );
  assert.deepEqual(dimension, {
    dimension: 'claim-justification',
    language: 'fr',
    condition: 'pack',
    planned: 4,
    notReceived: 1,
    expected: 3,
    missing: 1,
    notApplicable: 0,
    categories: ['PASS', 'FAIL', 'UNSCORABLE'],
    paired: 2,
    agreements: 0,
    disagreements: 2,
    contingency: [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
    ],
    leftMargins: [1, 1, 0],
    rightMargins: [1, 1, 0],
    rawAgreement: 0,
    expectedAgreement: 0.5,
    kappa: -1,
    undefinedReason: null,
  });
  const nonapplicable = report.dimensions.find(
    row => row.language === 'fr' && row.condition === 'pack' && row.dimension === 'unsupported-scope-extension',
  );
  assert(nonapplicable);
  assert.deepEqual(
    [
      nonapplicable.expected,
      nonapplicable.notApplicable,
      nonapplicable.missing,
      nonapplicable.paired,
      nonapplicable.kappa,
    ],
    [3, 3, 0, 0, null],
  );
  assert.equal(nonapplicable.undefinedReason, 'no_paired_data');
  for (const row of [...report.descriptive, ...report.dimensions, ...report.utility])
    assert.equal(row.planned, row.expected + row.notReceived);
  for (const row of report.descriptive)
    assert.equal(
      row.expected,
      row.missing + row.counts.PASS + row.counts.FAIL + row.counts.UNSCORABLE + row.counts.NOT_APPLICABLE,
    );
  assert.equal(report.globalScore, null);
});
