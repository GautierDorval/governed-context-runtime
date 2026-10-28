// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkBytes, compareLists, deriveLists, sha256, verifyT3Evidence} from '../scripts/verify-t3-evidence.mjs';
const answerBytes = await readFile(new URL('../evidence/mcp-apps-t3-2026-10-27/answer.txt', import.meta.url));
const answer = answerBytes.toString('utf8');
const bundle = await readFile(new URL('../spec/examples/semantic-boundaries/bundle.json', import.meta.url));
const expected = deriveLists(bundle, 'fictional-boreal-quebec-fr', 'project-assessment-chain');
test('public comparison is self-contained and explicitly excludes private and client replay', async () => {
  const result = await verifyT3Evidence();
  assert.equal(result.itemCount, 11);
  assert.equal(result.listCount, 5);
  assert.equal(result.privateTransportReproduced, false);
  assert.equal(result.historicalClientReplayed, false);
});
test('missing, added and duplicate entries invalidate the bounded list claim', () => {
  const first = '• ' + expected[0].values[0];
  for (const changed of [
    answer.replace(first + '\n', ''),
    answer.replace(first, first + '\n• Entrée supplémentaire.'),
    answer.replace(first, first + '\n' + first),
  ])
    assert.throws(() => compareLists(changed, expected));
});
test('entry order, wording, and repeated headings cannot pass a presence-only comparison', () => {
  const [a, b] = expected[0].values.map(v => '• ' + v);
  for (const changed of [
    answer.replace(a + '\n' + b, b + '\n' + a),
    answer.replace(a, a + ' '),
    answer.replace('activationConditions', 'activationConditions\nactivationConditions'),
  ])
    assert.throws(() => compareLists(changed, expected));
});
test('unexpected prose and a moved final boundary cannot hide an added list entry', () => {
  for (const changed of [
    answer.replace('nonApplicabilityConditions', 'Texte inattendu\nnonApplicabilityConditions'),
    answer.replace(
      'Preuves manquantes ou contradictoires',
      '• Entrée supplémentaire.\nPreuves manquantes ou contradictoires',
    ),
  ])
    assert.throws(() => compareLists(changed, expected));
});
test('raw-byte changes fail even when documented line splitting preserves list comparison', () => {
  const crlf = Buffer.from(answer.replace(/\r?\n/g, '\r\n'));
  assert.equal(compareLists(crlf.toString('utf8'), expected).length, 5);
  assert.throws(() => checkBytes(crlf, {bytes: answerBytes.length, sha256: sha256(answerBytes)}));
  const changed = Buffer.from(answerBytes);
  changed[0] ^= 1;
  assert.throws(() => checkBytes(changed, {bytes: answerBytes.length, sha256: sha256(answerBytes)}));
});
