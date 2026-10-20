// SPDX-License-Identifier: Apache-2.0
// Integrity and design checks only. No provider calls and no semantic scoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assemblePilotPrompt} from '../spec/examples/semantic-boundaries/assemble-prompt.mjs';
const base = new URL('../spec/examples/semantic-boundaries/', import.meta.url);
const read = (/** @type {string} */ file) => readFile(new URL(file, base));
const json = async (/** @type {string} */ file) => JSON.parse((await read(file)).toString('utf8'));
const sha = (/** @type {Uint8Array} */ bytes) => createHash('sha256').update(bytes).digest('hex');
const plan = await json('experiment-plan.json');
const scenarios = await json('scenarios.json');
const coverage = await json('prose-coverage.json');
const rubric = await json('judging-rubric.json');
/** @param {unknown} value @param {string} [prefix] @returns {string[]} */
function leaves(value, prefix = '') {
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([key, item]) =>
      leaves(item, prefix + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1')),
    );
  return [prefix];
}

test('pilot artifacts identify exact untruncated inputs and retain unknown token counts', async () => {
  for (const lang of plan.languages) {
    assert.equal(plan.inputs[lang].no_documentation, null);
    for (const condition of ['pack', 'exhaustive_text', 'canonical_prose']) {
      const input = plan.inputs[lang][condition];
      const bytes = await read(input.path);
      assert.equal(input.sha256, sha(bytes));
      assert.equal(input.bytes, bytes.length);
      assert.equal(input.unicodeScalars, [...bytes.toString('utf8')].length);
      assert.equal(input.tokens, null);
    }
    const prose = coverage.locales[lang];
    const bytes = await read(prose.file);
    assert.equal(prose.sha256, sha(bytes));
    assert.equal(prose.bytes, bytes.length);
    assert.equal(prose.unicodeScalars, [...bytes.toString('utf8')].length);
    assert.equal(prose.tokenCount, null);
  }
  assert.equal(plan.caseInput.sha256, sha(await read(plan.caseInput.path)));
  assert.equal(plan.assembly.noTruncation, true);
});

test('prose coverage accounts once for every source leaf and all 129 pack leaves with valid section targets', async () => {
  const source = await json('content.json');
  for (const lang of plan.languages) {
    const entry = coverage.locales[lang];
    const prose = (await read(entry.file)).toString('utf8');
    const anchors = [...prose.matchAll(/<a id="([^"]+)"><\/a>/g)].map(m => m[1]);
    assert.equal(new Set(anchors).size, anchors.length);
    const expectedSource = [
      ...leaves(source.locales[lang], '/locales/' + lang),
      '/fictional',
      '/identity',
      '/version',
      '/sourceNotice',
    ];
    const sourcePointers = entry.sourceUnits.map((/** @type {{sourcePointer: string}} */ x) => x.sourcePointer);
    assert.deepEqual(sourcePointers.sort(), expectedSource.sort());
    const packPointers = entry.packTerminalCoverage.map((/** @type {{packPointer: string}} */ x) => x.packPointer);
    assert.equal(packPointers.length, 129);
    assert.deepEqual(packPointers.sort(), leaves(await json(lang + '.pack.json')).sort());
    for (const unit of [...entry.sourceUnits, ...entry.packTerminalCoverage]) {
      assert(['covered', 'collapsed-projection', 'omitted', 'omitted-technical'].includes(unit.disposition));
      assert.equal(typeof unit.reason, 'string');
      assert(unit.reason.trim().length > 10);
      if (unit.disposition.startsWith('omitted')) assert.equal(unit.section, null);
      else assert(anchors.includes(unit.section), unit.sourcePointer ?? unit.packPointer);
    }
  }
});

test('fixed crossover order has 560 unique trials and exactly 35 appearances per position and condition', () => {
  assert.deepEqual(
    plan.cases,
    scenarios.cases.map((/** @type {{id: string}} */ x) => x.id),
  );
  assert.equal(plan.cases.length, 7);
  assert.deepEqual(plan.languages, ['fr', 'en']);
  assert.deepEqual(plan.conditions, ['pack', 'exhaustive_text', 'canonical_prose', 'no_documentation']);
  assert.equal(plan.repetitions, 10);
  const trials = new Set();
  const positions = plan.conditions.map(() => [0, 0, 0, 0]);
  for (let c = 0; c < 7; c++)
    for (let l = 0; l < 2; l++) {
      const subgroup = plan.conditions.map(() => [0, 0, 0, 0]);
      for (let r = 0; r < 10; r++) {
        const block = (c * 2 + l) * 10 + r;
        for (let p = 0; p < 4; p++) {
          const condition = (p + ((c + 2 * l + r) % 4)) % 4;
          trials.add([plan.cases[c], plan.languages[l], r + 1, plan.conditions[condition]].join('/'));
          positions[condition][p]++;
          subgroup[condition][p]++;
        }
      }
      for (const counts of subgroup) assert(counts.every((/** @type {number} */ n) => n === 2 || n === 3));
    }
  assert.equal(trials.size, 560);
  assert.equal(plan.expectedResponsesPerConfiguration, trials.size);
  for (const counts of positions) assert.deepEqual(counts, [35, 35, 35, 35]);
  assert.deepEqual(plan.order.globalPositionsPerCondition, [35, 35, 35, 35]);
  assert.equal(plan.order.trialsPerCondition, 140);
  assert.equal(
    plan.order.method,
    'For case index c, language index l and repetition r (zero-based), block b=(c*2+l)*10+r. Rotate [pack,exhaustive_text,canonical_prose,no_documentation] left by (c+2*l+r) mod 4. Iterate blocks ascending.',
  );
  assert.equal(plan.technicalRetries.maxAdditionalAttemptsPerTrial, 1);
  assert.equal(plan.technicalRetries.extraAttemptCeiling, 560);
  assert.equal(plan.technicalRetries.totalAttemptCeilingPerConfiguration, 1120);
});

test('the prepared plan contains no observed outcomes, hidden answer inputs or fabricated configuration', () => {
  assert.equal(plan.status, 'NOT_RUN');
  assert.equal(scenarios.status, 'NOT_RUN');
  assert.deepEqual(plan.observedResponses, []);
  assert.equal(plan.scores, null);
  for (const value of Object.values(plan.configuration)) assert.equal(value, null);
  for (const value of Object.values(plan.results)) assert.equal(value, null);
  assert.deepEqual(plan.caseInput.fields, ['cases[].evidence', 'cases[].<language>.question']);
  for (const excluded of [
    'illustrativeAnswer',
    'unacceptableClaims',
    'dimensions',
    'classification',
    'judging-rubric.json',
    'prose-coverage.json',
  ])
    assert(plan.caseInput.excludedFields.includes(excluded));
  for (const key of ['conditionLabelsSent', 'tools', 'retrieval', 'priorTrialMemory'])
    assert.equal(plan.assembly[key], false);
  assert.equal(plan.assembly.freshConversation, true);
  assert.equal(plan.outputTokenLimit, 512);
  assert.equal(plan.review.reviewers, 2);
  assert.equal(plan.analysis.noGlobalScore, true);
  assert.equal(plan.analysis.inferentialTests, null);
});

test('judging distinguishes applicable evidence retention, unsupported claims and common utility', () => {
  assert.equal(rubric.protocolVersion, plan.protocolVersion);
  assert.deepEqual(
    rubric.cases.map((/** @type {{id: string}} */ x) => x.id),
    plan.cases,
  );
  const dimensions = Object.keys(rubric.criteria).sort();
  assert.equal(dimensions.length, 10);
  for (const row of rubric.cases) {
    assert.deepEqual(Object.keys(row.applicability), plan.conditions);
    for (const condition of plan.conditions) {
      const applicability = row.applicability[condition];
      assert.deepEqual(Object.keys(applicability).sort(), dimensions);
      assert.equal(applicability['claim-justification'], 'APPLICABLE');
      assert.equal(applicability['reference-fabrication'], 'APPLICABLE');
      for (const value of Object.values(applicability))
        assert(['APPLICABLE', 'NOT_APPLICABLE'].includes(/** @type {string} */ (value)));
      if (condition === 'no_documentation')
        for (const dimension of ['condition-retention', 'exclusion-retention', 'reference-retention'])
          assert.equal(applicability[dimension], 'NOT_APPLICABLE');
      else assert.deepEqual(applicability, row.applicability.pack);
    }
    assert.equal(typeof row.utilityTask, 'string');
    assert.equal(typeof row.noDocumentationExpectation, 'string');
  }
  assert.deepEqual(plan.review.agreement.utilityCategories, rubric.outputs.documentaryUtility.categories);
  assert.equal(plan.review.agreement.rawAgreement, 'po = agreements / paired applicable judgments');
  assert.equal(
    plan.review.agreement.expectedAgreement,
    'pe = sum over categories of reviewer1 marginal proportion * reviewer2 marginal proportion',
  );
  assert.equal(plan.review.agreement.kappa, '(po - pe) / (1 - pe)');
  assert.equal(plan.review.agreement.postHocPooling, false);
  assert.equal(plan.review.agreement.universalThreshold, null);
});

test('prompt assembly emits exact bytes with no case IDs, conditions or teaching fields in any arm', async () => {
  assert.deepEqual(plan.caseInput.metadataFields, ['cases[].id']);
  assert.deepEqual(plan.assembly.payloadFields, ['evidence', 'question']);
  assert.equal(plan.assembly.implementation, 'assemble-prompt.mjs');
  assert.equal(
    plan.assembly.layout,
    'instruction + newline + <documentation> + newline + exact file bytes decoded as UTF-8 (empty for no_documentation) + newline + </documentation> + newline + <case> + JSON.stringify({evidence,question}) + </case>',
  );
  for (const language of /** @type {const} */ (['fr', 'en'])) {
    for (const condition of plan.conditions) {
      const documentationBytes =
        condition === 'no_documentation' ? new Uint8Array() : await read(plan.inputs[language][condition].path);
      const scenario = {
        id: 'CASE_ID_SENTINEL',
        classification: 'CLASS_SENTINEL',
        evidence: {location: 'CASE_EVIDENCE'},
        [language]: {
          question: 'Question?',
          illustrativeAnswer: 'ANSWER_SENTINEL',
          unacceptableClaims: ['CLAIM_SENTINEL'],
        },
        condition: 'CONDITION_SENTINEL',
      };
      const actual = assemblePilotPrompt({
        instruction: plan.instructions[language],
        documentationBytes,
        scenario,
        language,
      });
      const expected = Buffer.concat([
        Buffer.from(plan.instructions[language] + '\n<documentation>\n'),
        Buffer.from(documentationBytes),
        Buffer.from(
          '\n</documentation>\n<case>{"evidence":{"location":"CASE_EVIDENCE"},"question":"Question?"}</case>',
        ),
      ]);
      assert.deepEqual(Buffer.from(actual), expected);
      for (const marker of [
        'CASE_ID_SENTINEL',
        'CLASS_SENTINEL',
        'ANSWER_SENTINEL',
        'CLAIM_SENTINEL',
        'CONDITION_SENTINEL',
      ])
        assert(!Buffer.from(actual).toString().includes(marker));
      assert.equal(scenario.id, 'CASE_ID_SENTINEL');
    }
  }
  assert.throws(
    () =>
      assemblePilotPrompt({
        instruction: '',
        documentationBytes: new Uint8Array([0xff]),
        scenario: {evidence: {}, fr: {question: '?'}},
        language: 'fr',
      }),
    /encoded data/,
  );
});

test('crossover positions are nearly balanced within each language without claiming randomization', () => {
  for (let l = 0; l < 2; l++) {
    const counts = Array.from({length: 4}, () => [0, 0, 0, 0]);
    for (let c = 0; c < 7; c++)
      for (let r = 0; r < 10; r++) for (let p = 0; p < 4; p++) counts[(p + c + 2 * l + r) % 4][p]++;
    for (const positions of counts) assert.deepEqual(positions.sort(), [17, 17, 18, 18]);
  }
});

test('completed empty and truncated answers are never eligible for technical resampling', () => {
  assert.deepEqual(plan.technicalRetries.eligible, [
    'transport failure before a completed response',
    'explicit provider transient error with no completed response',
  ]);
  for (const kind of ['completed empty response', 'output truncated by the 512-token ceiling'])
    assert(plan.technicalRetries.ineligible.includes(kind));
  for (const key of ['completedEmpty', 'tokenLimit', 'transportPartial'])
    assert.equal(typeof plan.responseAccounting[key], 'string');
});

test('covered source identifiers point to the prose section that actually contains them', async () => {
  const source = await json('content.json');
  for (const lang of plan.languages) {
    const entry = coverage.locales[lang];
    const text = (await read(entry.file)).toString('utf8');
    const sections = Object.fromEntries(
      [...text.matchAll(/<a id="([^"]+)"><\/a>([\s\S]*?)(?=<a id=|$)/g)].map(m => [m[1], m[2]]),
    );
    for (const row of entry.sourceUnits) {
      if (
        row.disposition !== 'covered' ||
        !/(?:\/id|\/ruleId|\/linkedCausalContextId|\/canonicalServiceUrlFr|\/canonicalServiceUrlEn|\/sourceArtifact)$/.test(
          row.sourcePointer,
        )
      )
        continue;
      let value = source;
      for (const part of row.sourcePointer.slice(1).split('/')) value = value[part];
      assert(sections[row.section].includes(value), row.sourcePointer + ' -> ' + row.section);
    }
  }
});
