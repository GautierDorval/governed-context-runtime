// SPDX-License-Identifier: Apache-2.0
// Maintenance path tests. Every case runs in a temporary copy of the package, removed afterwards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdtemp, rm, readFile, writeFile, symlink, lstat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {check, write, recover, compute} from './regenerate.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function withCopy(t, body) {
  const dir = await mkdtemp(join(tmpdir(), 'gcr-maintenance-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await cp(source, dir, {
    recursive: true,
    filter: path => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.slice(source.length - 1)),
  });
  return body(dir);
}
function checker(dir) {
  try {
    execFileSync(process.execPath, ['scripts/check-package.mjs'], {cwd: dir, stdio: 'pipe'});
    return 'PASS';
  } catch (error) {
    return (
      'FAIL ' +
      (error.stderr || '')
        .toString()
        .split('\n')
        .find(line => /Error|Assertion|expected|message/.test(line))
    );
  }
}
async function edit(dir, path, change) {
  const file = join(dir, path);
  await writeFile(file, change((await readFile(file)).toString('utf8')));
}
async function rejectsWith(promise, code) {
  await assert.rejects(promise, error => error.code === code, 'expected ' + code);
}

test('the published package is consistent and regeneration is a no-op', async t =>
  withCopy(t, async dir => {
    assert.equal(checker(dir), 'PASS');
    assert.deepEqual(await check(dir), []);
  }));

test('a French documentation fix is detected, then accepted after regeneration and review', async t =>
  withCopy(t, async dir => {
    await edit(dir, 'docs/fr/README.md', text =>
      text.replace(/\n*$/, '\n\nPrécision : exemple de correction typographique.\n'),
    );
    assert.match(checker(dir), /^FAIL/, 'the stale registry must be detected before regeneration');
    assert.deepEqual(await check(dir), ['rights.json', 'package-manifest.json']);
    await write(dir);
    assert.equal(checker(dir), 'PASS');
  }));

test('a same-length Action SHA change is a change until metadata is regenerated', async t =>
  withCopy(t, async dir => {
    const workflow = '.github/workflows/verify.yml';
    const before = await readFile(join(dir, workflow), 'utf8');
    const pinned = before.match(/actions\/checkout@([0-9a-f]{40})/)[1];
    const replacement = pinned.split('').reverse().join('');
    await edit(dir, workflow, text => text.replace(pinned, replacement));
    assert.equal((await readFile(join(dir, workflow))).length, Buffer.byteLength(before));
    assert.match(checker(dir), /^FAIL/);
    await write(dir);
    assert.equal(checker(dir), 'PASS');
  }));

test('an unexpected file is refused even when added to a hand-edited manifest', async t =>
  withCopy(t, async dir => {
    await writeFile(join(dir, 'extra.md'), 'unreviewed\n');
    await edit(dir, 'package-manifest.json', text => {
      const manifest = JSON.parse(text);
      manifest.files.push({path: 'extra.md', sha256: hash(Buffer.from('unreviewed\n')), bytes: 11});
      return JSON.stringify(manifest, null, 2) + '\n';
    });
    assert.match(checker(dir), /^FAIL/);
    await rejectsWith(compute(dir), 'unexpected_file');
  }));

test('a missing rights entry is refused', async t =>
  withCopy(t, async dir => {
    await edit(dir, 'rights.json', text => {
      const rights = JSON.parse(text);
      rights.files = rights.files.filter(row => row.path !== 'docs/en/README.md');
      return JSON.stringify(rights, null, 2) + '\n';
    });
    assert.match(checker(dir), /^FAIL/);
  }));

test('a symbolic link is refused', async t =>
  withCopy(t, async dir => {
    try {
      await symlink(join(dir, 'README.md'), join(dir, 'docs', 'link.md'));
    } catch (error) {
      if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('symlinks need privileges on this platform');
      throw error;
    }
    assert.equal((await lstat(join(dir, 'docs', 'link.md'))).isSymbolicLink(), true);
    assert.match(checker(dir), /^FAIL/);
    await rejectsWith(compute(dir), 'symlink_refused');
  }));

test('a policy change is never absorbed silently', async t =>
  withCopy(t, async dir => {
    await edit(dir, 'NOTICE.md', text => text.replace('All rights reserved', 'CC-BY-4.0'));
    await rejectsWith(compute(dir), 'policy_review_required');
    assert.match(checker(dir), /^FAIL/);
    await edit(dir, 'NOTICE.md', text =>
      text.replace('CC-BY-4.0 | Not licensed for reuse', 'All rights reserved | Not licensed for reuse'),
    );
    await edit(dir, 'rights.json', text => text.replace('"license": "All rights reserved"', '"license": "CC-BY-4.0"'));
    await write(dir);
    const rights = JSON.parse(await readFile(join(dir, 'rights.json'), 'utf8'));
    assert.equal(
      rights.files.find(row => row.path === 'assets/banner.svg').license,
      'All rights reserved',
      'the rule, not the edited registry, decides',
    );
  }));

test('regeneration is idempotent', async t =>
  withCopy(t, async dir => {
    await write(dir);
    const first = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
    await write(dir);
    assert.deepEqual(
      [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
      first,
    );
  }));

test('an interrupted write is reported and the last consistent registries are recoverable', async t =>
  withCopy(t, async dir => {
    const consistent = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
    await edit(dir, 'docs/en/README.md', text => text + '\nA pending clarification.\n');
    await rejectsWith(write(dir, {faultAfterFirstRename: true}), 'simulated_interruption');
    assert.match(checker(dir), /^FAIL/, 'the intermediate state must not pass');
    await rejectsWith(compute(dir), 'incomplete_previous_write');
    await recover(dir);
    assert.deepEqual(
      [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
      consistent,
    );
    await write(dir);
    assert.equal(checker(dir), 'PASS');
  }));
