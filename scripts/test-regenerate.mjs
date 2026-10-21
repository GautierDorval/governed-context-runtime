// SPDX-License-Identifier: Apache-2.0
// Maintenance path tests. Every case runs in a temporary copy of the package, removed afterwards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdtemp, rm, readFile, writeFile, symlink, lstat, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {check, write, recover, compute, RegenerateError} from './regenerate.mjs';
/** @import {FileRights} from './package-types.d.mts' */

const source = fileURLToPath(new URL('../', import.meta.url));
/** @param {Uint8Array} bytes */
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** @param {import('node:test').TestContext} t @param {(dir: string) => Promise<void>} body */
async function withCopy(t, body) {
  const dir = await mkdtemp(join(tmpdir(), 'gcr-maintenance-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await cp(source, dir, {
    recursive: true,
    filter: path => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.slice(source.length - 1)),
  });
  return body(dir);
}
/** @param {string} dir */
function checker(dir) {
  try {
    execFileSync(process.execPath, ['scripts/check-package.mjs'], {cwd: dir, stdio: 'pipe'});
    return 'PASS';
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '') : '';
    return 'FAIL ' + stderr.split('\n').find(line => /Error|Assertion|expected|message/.test(line));
  }
}
/** @param {string} dir @param {string} path @param {(text: string) => string} change */
async function edit(dir, path, change) {
  const file = join(dir, path);
  await writeFile(file, change((await readFile(file)).toString('utf8')));
}
/** @param {Promise<unknown>} promise @param {string} code */
async function rejectsWith(promise, code) {
  await assert.rejects(promise, error => error instanceof RegenerateError && error.code === code, 'expected ' + code);
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
    const match = before.match(/actions\/checkout@([0-9a-f]{40})/);
    assert(match, 'the workflow pins actions/checkout by full SHA');
    const pinned = match[1];
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
      /** @type {FileRights} */
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
      const code = error instanceof Error && 'code' in error ? error.code : undefined;
      if (code === 'EPERM' || code === 'EACCES') return t.skip('symlinks need privileges on this platform');
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
    /** @type {FileRights} */
    const rights = JSON.parse(await readFile(join(dir, 'rights.json'), 'utf8'));
    assert.equal(
      rights.files.find(row => row.path === 'assets/banner.svg')?.license,
      'All rights reserved',
      'the rule, not the edited registry, decides',
    );
  }));

test('a schema change is refused even after regeneration until its locator is reviewed', async t =>
  withCopy(t, async dir => {
    await edit(dir, 'spec/runtime-snapshot.schema.json', text =>
      text.replace('Additive finite runtime snapshot', 'Edited runtime snapshot'),
    );
    await write(dir);
    assert.match(checker(dir), /^FAIL/, 'the schema edition digest still differs');
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

for (const faultAt of /** @type {const} */ ([
  'staging-created',
  'first-backup',
  'staged',
  'published',
  'first-replacement',
])) {
  test('recovery preserves the previous registries after interruption at ' + faultAt, async t =>
    withCopy(t, async dir => {
      const before = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
      await edit(dir, 'docs/en/README.md', text => text + '\nA pending clarification.\n');
      await rejectsWith(write(dir, {faultAt}), 'simulated_interruption');
      await rejectsWith(compute(dir), 'incomplete_previous_write');
      assert.match(checker(dir), /^FAIL/);
      await recover(dir);
      assert.deepEqual(
        [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
        before,
      );
      await write(dir);
      assert.equal(checker(dir), 'PASS');
    }),
  );
}

test('CLI recovery discards a partial staging backup without changing the registries', async t =>
  withCopy(t, async dir => {
    const before = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
    await rejectsWith(write(dir, {faultAt: 'first-backup'}), 'simulated_interruption');
    await writeFile(join(dir, '.regenerate-staging', 'backup', 'rights.json'), 'partial copy');
    execFileSync(process.execPath, ['scripts/regenerate.mjs', '--recover'], {cwd: dir, stdio: 'pipe'});
    assert.deepEqual(
      [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
      before,
    );
    assert.equal(checker(dir), 'PASS');
  }));

test('interrupted cleanup keeps the completed new registries', async t =>
  withCopy(t, async dir => {
    const before = await readFile(join(dir, 'rights.json'));
    await edit(dir, 'docs/en/README.md', text => text + '\nA completed clarification.\n');
    await rejectsWith(write(dir, {faultAt: 'cleanup-started'}), 'simulated_interruption');
    const committed = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
    assert.notDeepEqual(committed[0], before);
    await rm(join(dir, '.regenerate-staging', 'backup', 'rights.json'));
    await rejectsWith(compute(dir), 'incomplete_previous_write');
    await recover(dir);
    assert.deepEqual(
      [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
      committed,
    );
    assert.equal(checker(dir), 'PASS');
  }));

test('missing recovery backup refuses restoration before changing either registry', async t =>
  withCopy(t, async dir => {
    await rejectsWith(write(dir, {faultAt: 'published'}), 'simulated_interruption');
    await writeFile(join(dir, 'rights.json'), 'preserve this current content');
    await rm(join(dir, '.regenerate', 'backup', 'package-manifest.json'));
    const before = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
    await assert.rejects(recover(dir), error => error instanceof Error && 'code' in error && error.code === 'ENOENT');
    assert.deepEqual(
      [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
      before,
    );
  }));

test('conflicting staging and published recovery directories are preserved for diagnosis', async t =>
  withCopy(t, async dir => {
    await rejectsWith(write(dir, {faultAt: 'published'}), 'simulated_interruption');
    await mkdir(join(dir, '.regenerate-staging'));
    const before = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
    await rejectsWith(recover(dir), 'ambiguous_recovery_state');
    assert.deepEqual(
      [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
      before,
    );
    assert((await lstat(join(dir, '.regenerate'))).isDirectory());
    assert((await lstat(join(dir, '.regenerate-staging'))).isDirectory());
  }));

for (const name of ['rights.json', 'package-manifest.json']) {
  test('a truncated legacy ' + name + ' backup preserves both current registries', async t =>
    withCopy(t, async dir => {
      await rejectsWith(write(dir, {faultAt: 'published'}), 'simulated_interruption');
      await writeFile(join(dir, 'rights.json'), 'preserve this current content');
      await writeFile(join(dir, '.regenerate', 'backup', name), '{"schema":');
      const before = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
      await rejectsWith(recover(dir), 'invalid_json');
      assert.deepEqual(
        [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
        before,
      );
      assert((await lstat(join(dir, '.regenerate'))).isDirectory());
    }),
  );
}

for (const directory of ['.regenerate-staging', '.regenerate']) {
  for (const fault of ['missing-marker', 'invalid-marker', 'extra-file', 'extra-backup']) {
    test('recovery preserves ' + directory + ' with ' + fault, async t =>
      withCopy(t, async dir => {
        const faultAt = directory === '.regenerate' ? 'published' : 'staged';
        await rejectsWith(write(dir, {faultAt}), 'simulated_interruption');
        const state = join(dir, directory);
        if (fault === 'missing-marker') await rm(join(state, 'owner.json'));
        if (fault === 'invalid-marker') await writeFile(join(state, 'owner.json'), 'unrelated owner');
        const extra = fault === 'extra-backup' ? join(state, 'backup', 'user.txt') : join(state, 'user.txt');
        if (fault.startsWith('extra-')) await writeFile(extra, 'preserve user data');
        const before = [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))];
        await rejectsWith(recover(dir), 'unrecognized_recovery_state');
        assert.deepEqual(
          [await readFile(join(dir, 'rights.json')), await readFile(join(dir, 'package-manifest.json'))],
          before,
        );
        assert((await lstat(state)).isDirectory());
        if (fault.startsWith('extra-')) assert.equal(await readFile(extra, 'utf8'), 'preserve user data');
      }),
    );
  }
}

test('CLI recovery preserves an unrelated staging directory', async t =>
  withCopy(t, async dir => {
    const staging = join(dir, '.regenerate-staging');
    await mkdir(staging);
    await writeFile(join(staging, 'notes.txt'), 'unrelated notes');
    await rejectsWith(compute(dir), 'incomplete_previous_write');
    assert.throws(() =>
      execFileSync(process.execPath, ['scripts/regenerate.mjs', '--recover'], {cwd: dir, stdio: 'pipe'}),
    );
    assert.equal(await readFile(join(staging, 'notes.txt'), 'utf8'), 'unrelated notes');
  }));

test('recovery refuses a directory link instead of traversing it', async t =>
  withCopy(t, async dir => {
    const outside = await mkdtemp(join(tmpdir(), 'gcr-unrelated-'));
    t.after(() => rm(outside, {recursive: true, force: true}));
    await writeFile(join(outside, 'notes.txt'), 'preserve link target');
    await symlink(outside, join(dir, '.regenerate-staging'), process.platform === 'win32' ? 'junction' : 'dir');
    await rejectsWith(recover(dir), 'unrecognized_recovery_state');
    assert.equal(await readFile(join(outside, 'notes.txt'), 'utf8'), 'preserve link target');
    assert((await lstat(join(dir, '.regenerate-staging'))).isSymbolicLink());
  }));

// Child-process version overrides exercise the CLI gate itself without another Node installation.
for (const version of ['22.22.0', '24.16.999', '24.17.0', '24.18.0', '25.0.0']) {
  test('package checker enforces the Node minimum at ' + version, () => {
    const prelude =
      'data:text/javascript,' +
      encodeURIComponent(`Object.defineProperty(process.versions, 'node', {value: ${JSON.stringify(version)}});`);
    const run = () =>
      execFileSync(process.execPath, ['--import', prelude, 'scripts/check-package.mjs'], {cwd: source, stdio: 'pipe'});
    if (version === '22.22.0' || version === '24.16.999') {
      assert.throws(
        run,
        error =>
          error instanceof Error &&
          'stderr' in error &&
          String(error.stderr).includes('Node.js >=24.17.0 required; received ' + version),
      );
    } else assert.doesNotThrow(run);
  });
}

for (const variant of ['docs', 'cff', 'lock-root', 'package-and-lock']) {
  test('edition consistency refuses regenerated drift: ' + variant, async t =>
    withCopy(t, async dir => {
      if (variant === 'cff') {
        await edit(dir, 'CITATION.cff', text => text.replace(/^version: .+$/m, 'version: 9.9.9-proposed'));
        const raw = await readFile(join(dir, 'CITATION.cff'));
        await edit(dir, 'package-policy.json', text => {
          const value = JSON.parse(text);
          value.declarationDigests['CITATION.cff'] = hash(raw);
          return JSON.stringify(value, null, 2) + '\n';
        });
      } else {
        const paths =
          variant === 'docs'
            ? ['docs/source.json']
            : variant === 'lock-root'
              ? ['package-lock.json']
              : ['package.json', 'package-lock.json'];
        for (const path of paths)
          await edit(dir, path, text => {
            const value = JSON.parse(text);
            if (variant === 'docs') value.documentVersion = '9.9.9-proposed';
            else if (variant === 'lock-root') value.packages[''].version = '9.9.9-proposed';
            else {
              value.version = '9.9.9-proposed';
              if (value.packages) value.packages[''].version = value.version;
            }
            return JSON.stringify(value, null, 2) + '\n';
          });
      }
      await write(dir);
      assert.deepEqual(await check(dir), [], 'digests are current; the rejection must concern edition identity');
      assert.match(checker(dir), /^FAIL .*edition:/, 'a refreshed manifest must not hide mixed edition metadata');
    }),
  );
}

for (const variant of [
  'missing',
  'different',
  'impossible',
  'duplicate',
  'quoted-key',
  'indented',
  'trailing-space',
  'valid-plus-indented',
  'valid-plus-quoted',
]) {
  test('release citation refuses changed date metadata after refreshed digests: ' + variant, async t =>
    withCopy(t, async dir => {
      await edit(dir, 'CITATION.cff', text => {
        const date = 'date-released: 2026-10-21';
        const replacement = {
          missing: '',
          different: 'date-released: 2026-10-22',
          impossible: 'date-released: 2026-02-30',
          duplicate: date + '\n' + date,
          'quoted-key': '"date-released": 2026-10-21',
          indented: '  ' + date,
          'trailing-space': date + ' ',
          'valid-plus-indented': date + '\n  date-released: 2026-10-22',
          'valid-plus-quoted': date + '\n"date-released": 2026-10-22',
        }[variant];
        assert(replacement !== undefined, 'recognized date mutation');
        return text.replace(date, replacement);
      });
      const raw = await readFile(join(dir, 'CITATION.cff'));
      await edit(dir, 'package-policy.json', text => {
        const value = JSON.parse(text);
        value.declarationDigests['CITATION.cff'] = hash(raw);
        return JSON.stringify(value, null, 2) + '\n';
      });
      await write(dir);
      assert.deepEqual(await check(dir), []);
      assert.match(checker(dir), /^FAIL .*edition: (exactly one release date|reviewed release date)/);
    }),
  );
}
