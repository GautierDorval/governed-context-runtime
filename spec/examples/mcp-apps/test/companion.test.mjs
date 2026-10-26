// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspect,selection,contextText} from '../data.mjs';
import {PackSession} from '../session.mjs';
const wanted=lang=>({...selection,lang});
const reply=async lang=>{const view=await inspect(wanted(lang));return {_meta:{gcr:{view,contextText:contextText(view)}}};};
for(const lang of ['fr','en'])test('whole pack and archived restrictions '+lang,async()=>{
 const view=await inspect(wanted(lang));const text=contextText(view);
 assert.equal(view.pack.lang,lang);assert.equal(view.verification.snapshotChecks,330);
 assert.equal(view.verification.modelUseObserved,false);assert.equal(view.verification.signatureTrust,'not-established');
 assert.equal(view.pack.packId,'fictional-boreal-quebec-'+lang);
 for(const field of ['activationConditions','nonApplicabilityConditions','requiredEvidence','forbiddenInferences','applicabilityAbuseBoundaries']){
  assert.ok(view.pack[field].length);assert.ok(text.includes(JSON.stringify(view.pack[field],null,2).slice(1,-1).trim().split('\n')[0].trim()));
 }
 const projection=JSON.parse(text.slice(text.indexOf('\n')+1));
 assert.deepEqual(projection.pack,JSON.parse(JSON.stringify(view.pack)));assert.deepEqual(projection.manifest,JSON.parse(JSON.stringify(view.manifest)));assert.deepEqual(projection.units,JSON.parse(JSON.stringify(view.units)));
 assert.deepEqual(projection.archivedSources.map(s=>[s.sourcePath,s.repositoryDigest]),view.sources.map(s=>[s.sourcePath,s.repositoryDigest]),'every verified dependency must remain in the submitted projection');
 const fixture=JSON.parse(await readFile(new URL('../reference/spec/examples/semantic-boundaries/bundle.json',import.meta.url),'utf8'));
 const dependencies=fixture.snapshot.inventory.packs.find(p=>p.packId===view.pack.packId).dependencies;
 for(const dependency of dependencies)assert.ok(projection.archivedSources.some(s=>s.sourcePath===dependency),'missing indexed dependency: '+dependency);
 for(const source of projection.archivedSources)assert.equal(source.text,Buffer.from(view.sources.find(s=>s.sourcePath===source.sourcePath).contentBase64,'base64').toString('utf8'));
 assert.deepEqual(JSON.parse(Buffer.from(view.originalBytes.packBase64,'base64')),JSON.parse(JSON.stringify(view.pack)));
});
for(const [key,value] of [['lang','de'],['intentToken','free-text'],['version','0.1.0'],['expectedRoot','sha-256:'+'0'.repeat(64)]])
test('reject exact selection mismatch '+key,()=>assert.rejects(inspect({...wanted('fr'),[key]:value}),/selection_not_admitted/));
test('corrupt archive cannot produce a verified view',async()=>{
 const fixture=JSON.parse(await readFile(new URL('../reference/spec/examples/semantic-boundaries/bundle.json',import.meta.url),'utf8'));
 fixture.archives[Object.keys(fixture.archives)[0]]=Buffer.from('{}').toString('base64');
 await assert.rejects(inspect(wanted('fr'),fixture));
});
test('changed corpus root is refused',async()=>{
 const fixture=JSON.parse(await readFile(new URL('../reference/spec/examples/semantic-boundaries/bundle.json',import.meta.url),'utf8'));
 fixture.snapshot.corpusRootDigest='sha-256:'+'0'.repeat(64);
 await assert.rejects(inspect(wanted('fr'),fixture),/unexpected_corpus_root/);
});
test('context is complete or refused; never silently truncated',async()=>{
 const view=await inspect(wanted('fr'));view.archivedSources[0].text='x'.repeat(210000);
 assert.throws(()=>contextText(view),/no_truncation/);
});
test('display, submit and acknowledgement stay distinct',async()=>{
 let acknowledge;const sent=[];const phases=[];
 const s=new PackSession({load:()=>reply('fr'),send:text=>{sent.push(text);return new Promise(r=>acknowledge=r);},changed:x=>phases.push(x.phase)});
 s.select(wanted('fr'));await s.inspect();assert.equal(s.state.phase,'displayed');assert.equal(sent.length,0);
 const pending=s.submit();assert.equal(s.state.phase,'submitted');acknowledge({});await pending;
 assert.equal(s.state.phase,'accepted');assert.equal(sent.length,1);assert.deepEqual(phases,['selected','loading','displayed','submitted','accepted']);
});
for(const mode of ['refusal','timeout','missing-ack'])test('no false success on '+mode,async()=>{
 const s=new PackSession({load:()=>reply('fr'),send:async()=>{if(mode==='timeout')throw Error('timeout');return mode==='refusal'?{isError:true}:undefined;}});
 s.select(wanted('fr'));await s.inspect();await s.submit();assert.equal(s.state.phase,'unconfirmed');
 await assert.rejects(s.submit(),/verified_preview_required/);await s.inspect();assert.equal(s.state.phase,'displayed');
});
test('selection change invalidates a late preview',async()=>{
 let finish;const s=new PackSession({load:()=>new Promise(r=>finish=r),send:()=>{throw Error('must_not_send');}});
 s.select(wanted('fr'));const pending=s.inspect();s.select(wanted('en'));finish(await reply('fr'));await pending;
 assert.equal(s.state.phase,'selected');assert.equal(s.state.selection.lang,'en');assert.equal(s.state.view,null);
 await assert.rejects(s.submit(),/verified_preview_required/);
});
test('selection change invalidates prior acceptance and a late acknowledgement',async()=>{
 let finish;const s=new PackSession({load:()=>reply('fr'),send:()=>new Promise(r=>finish=r)});
 s.select(wanted('fr'));await s.inspect();const pending=s.submit();s.select(wanted('en'));finish({});await pending;
 assert.equal(s.state.phase,'selected');assert.equal(s.state.text,null);
});
test('wrong preview language is never marked verified',async()=>{
 let sent=false;const s=new PackSession({load:()=>reply('en'),send:()=>{sent=true;}});
 s.select(wanted('fr'));await s.inspect();assert.equal(s.state.phase,'failed');await assert.rejects(s.submit());assert.equal(sent,false);
});
test('failed verification and disconnect remove stale usable context',async()=>{
 let fail=false;const s=new PackSession({load:async()=>fail?{isError:true}:reply('fr'),send:async()=>({})});
 s.select(wanted('fr'));await s.inspect();await s.submit();assert.equal(s.state.phase,'accepted');
 fail=true;await s.inspect();assert.equal(s.state.phase,'failed');assert.equal(s.state.view,null);
 fail=false;await s.inspect();s.disconnect();assert.equal(s.state.phase,'disconnected');await assert.rejects(s.submit());
});

for(const outcome of ['reply','error'])test('disconnect invalidates a pending preview '+outcome,async()=>{
 let resolveLoad,rejectLoad;
 const s=new PackSession({load:()=>new Promise((resolve,reject)=>{resolveLoad=resolve;rejectLoad=reject;}),send:()=>{throw Error('must_not_send');}});
 s.select(wanted('fr'));const pending=s.inspect();s.disconnect();
 const disconnected={...s.state};
 if(outcome==='reply')resolveLoad(await reply('fr'));else rejectLoad(Error('late_failure'));
 await pending;assert.deepEqual(s.state,disconnected);await assert.rejects(s.submit(),/verified_preview_required/);
});
for(const outcome of ['reply','error'])test('disconnect invalidates a pending acknowledgement '+outcome,async()=>{
 let resolveSend,rejectSend;
 const s=new PackSession({load:()=>reply('fr'),send:()=>new Promise((resolve,reject)=>{resolveSend=resolve;rejectSend=reject;})});
 s.select(wanted('fr'));await s.inspect();const pending=s.submit();s.disconnect();
 const disconnected={...s.state};
 if(outcome==='reply')resolveSend({});else rejectSend(Error('late_failure'));
 await pending;assert.deepEqual(s.state,disconnected);await assert.rejects(s.submit(),/verified_preview_required/);
});
