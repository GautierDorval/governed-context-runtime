// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const run=args=>spawnSync(process.execPath,['spec/examples/reproduction/run.mjs',...args],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
const policy=['--policy','spec/examples/reproduction/policy.json'];
test('public CLI help, explicit policy and refused exit are observable',()=>{
 const help=run(['--help']);assert.equal(help.status,0);assert.match(help.stdout,/--policy/);
 const missing=run([]);assert.equal(missing.status,2);assert.equal(JSON.parse(missing.stderr).reason,'explicit_policy_required');
 const wrong=run([...policy,'--lang','de']);assert.equal(wrong.status,2);assert.equal(JSON.parse(wrong.stdout).case.consumerCalls,0);
});
test('public CLI suite returns every fixed expectation and zero rejected handoffs',()=>{
 const r=run([...policy,'--suite']);assert.equal(r.error,undefined);assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);assert.equal(report.status,'PRODUCER_REPRODUCED');assert.equal(report.externalReproduction,'NOT_RUN');
 assert.equal(report.cases.length,16);assert(report.cases.every(c=>c.verdict==='PASS'));
 assert(report.cases.filter(c=>!c.delivered).every(c=>c.consumerCalls===0));
 const en=report.cases.find(c=>c.id==='nominal-en'),fr=report.cases.find(c=>c.id==='nominal-fr');
 assert.equal(en.content.pack.lang,'en');assert.equal(fr.content.pack.lang,'fr');
 assert.equal(en.content.verification.usePermission,'inspect-context');assert.equal(en.consumerCalls,1);
});
