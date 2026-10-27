// SPDX-License-Identifier: Apache-2.0
// Materialize a runnable artifact OUTSIDE the reference package; never install here.
import {mkdir, readFile, writeFile, realpath, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve, relative, sep, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '../../..');
const target = resolve(process.argv[2] ?? '');
if (process.argv.length !== 3) throw Error('usage: node spec/examples/mcp-apps/prepare.mjs <new-output-directory>');
const parent = await realpath(dirname(target));
const actualTarget = resolve(parent, target.split(sep).at(-1));
const inside = relative(await realpath(root), actualTarget);
if (!inside.startsWith('..' + sep) && inside !== '..') throw Error('output_must_be_outside_reference_checkout');
try { await stat(actualTarget); throw Error('output_already_exists_use_a_new_directory'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const pin = JSON.parse(await readFile(resolve(source, 'reference-source.json'), 'utf8'));
const referenceFiles = [];
for (const [path, expected] of Object.entries(pin.files)) {
  const bytes = execFileSync('git', ['show', pin.commit + ':' + path], {cwd:root, maxBuffer:4*1024*1024});
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error('reference_source_digest_mismatch:' + path);
  referenceFiles.push([path, bytes]);
}
await mkdir(actualTarget);
const artifactSources=['package.json','package-lock.json','reference-source.json','build.mjs','data.mjs','server.mjs','session.mjs','diagnostic.mjs','diagnostic-ui.mjs','ui.mjs','ui.html','test/companion.test.mjs','test/diagnostic.test.mjs','test/stdio.test.mjs','test/browser.mjs'];
for (const name of artifactSources) {
  const destination=resolve(actualTarget,name);
  await mkdir(dirname(destination),{recursive:true});
  await writeFile(destination,await readFile(resolve(source,name)));
}
for (const [path, bytes] of referenceFiles) {
  const destination = resolve(actualTarget, 'reference', path);
  await mkdir(dirname(destination), {recursive:true});
  await writeFile(destination, bytes);
}
await writeFile(resolve(actualTarget, '.gcr-companion-artifact.json'), JSON.stringify({sourceRoot:root,referenceCommit:pin.commit}, null, 2)+'\n');
console.log('Prepared companion artifact: ' + actualTarget);
