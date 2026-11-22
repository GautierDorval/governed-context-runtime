import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOfflineArchive, fictionSignals, sha256} from '../scripts/analyze-retained-pilot.mjs';
import {accountPilotAttempts} from '../spec/examples/semantic-boundaries/pilot-execution.mjs';

test('fiction wording is distinct from identifiers, JSON keys and absent metadata', () => {
  assert.deepEqual(fictionSignals({fictional: true, source: 'fictional-boreal-service'}), {
    readableOccurrences: 0,
    technicalOccurrences: 2,
    readablePresent: false,
  });
  assert.deepEqual(fictionSignals('Une offre fictive pour cet exercice. fictional-boreal-service'), {
    readableOccurrences: 2,
    technicalOccurrences: 1,
    readablePresent: true,
  });
  assert.equal(
    fictionSignals({question: 'Can this project proceed?', evidence: {location: 'Quebec'}}).readablePresent,
    false,
  );
  assert.equal(fictionSignals({name: 'Fictional Boreal Workshop'}).readablePresent, true);
});

test('offline reader refuses changed bytes, unlisted inputs and mutations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gcr-offline-reader-'));
  try {
    const key = 'campaigns/gcr-pilot-20261107/inputs/example.json',
      original = '{"a":1}';
    const file = join(directory, sha256(key) + '.json');
    await writeFile(file, original);
    const archive = createOfflineArchive(directory, [{key, bytes: original.length, sha256: sha256(original)}]);
    assert.equal((await archive.bytes(key)).toString(), original);
    assert.throws(() => archive.bucket.put(key, original), /read_only/);
    assert.throws(() => archive.bucket.delete(key), /read_only/);
    await assert.rejects(archive.bytes(key + '-absent'), /unlisted_archive_object/);
    await writeFile(file, '{"a":2}');
    await assert.rejects(archive.bytes(key), /archive_digest/);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('completed empty or capped responses cannot become independent retry observations', () => {
  /** @type {import('../spec/examples/semantic-boundaries/pilot-execution.mjs').Attempt} */
  const first = {
    trialId: 'one',
    attemptNumber: 1,
    outcome: {
      kind: 'completed_response',
      completed: true,
      judgment: null,
      rawText: '',
      rawBody: '{}',
      finishReason: 'max_tokens',
      providerResponseId: null,
      model: 'synthetic',
      usage: null,
      refusal: null,
      emptyAfterTrim: true,
      outputLimited: true,
    },
  };
  assert.equal(accountPilotAttempts(['one'], [first]).received, 1);
  assert.equal(accountPilotAttempts(['one'], [first]).completedEmpty, 1);
  assert.throws(() => accountPilotAttempts(['one'], [first, {...first, attemptNumber: 2}]), /retry_ineligible/);
});
