// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {DiagnosticSession,assertContextSize,diagnosticPrompt,MAX_CONTEXT_BYTES} from '../diagnostic.mjs';
import {PackSession} from '../session.mjs';
import {inspect,selection,contextText} from '../data.mjs';
const base={mode:'short',lang:'fr',connected:true,textCapability:true};
const evidence=d=>d.observerEvidence({evaluationAndReloadComplete:true});
const pack=async()=>{const p=new PackSession({load:async args=>{const view=await inspect(args);return {_meta:{gcr:{view,contextText:contextText(view)}}};},send:async()=>({})});p.select({...selection,lang:'fr'});await p.inspect();return p;};
test('fresh 128-bit cryptographic nonce per explicit submit, no implicit call or public leakage',async()=>{
 let draws=0;const sent=[];const states=[];
 const crypto={getRandomValues:b=>{assert.equal(b.length,16);return b.fill(++draws);},subtle:webcrypto.subtle};
 const d=new DiagnosticSession({crypto,send:async text=>{sent.push(text);return {};},changed:s=>states.push(structuredClone(s))});
 assert.equal(draws,0);assert.equal(sent.length,0);assert.throws(()=>d.observerEvidence(),/requires_completed/);
 await d.submit(base);await d.submit(base);
 assert.equal(sent.length,2);assert.equal(draws,4);
 const [a,b]=evidence(d);assert.match(a.expected,/^[a-f0-9]{32}$/);assert.notEqual(a.expected,b.expected);assert.notEqual(a.trialId,a.expected);
 for(const item of [a,b]){assert.equal(JSON.stringify(states).includes(item.expected),false);assert.equal(JSON.stringify(diagnosticPrompt).includes(item.expected),false);assert.equal(item.textUtf8Bytes,Buffer.byteLength(item.text,'utf8'));assert.equal(item.textSha256,Buffer.from(await webcrypto.subtle.digest('SHA-256',Buffer.from(item.text))).toString('hex'));}
 assert.equal(d.state.phase,'acknowledged');assert.equal('responseObserved' in d.state,false);
});
for(const crypto of [null,{}, {getRandomValues:()=>{throw Error('do not fall back');},subtle:webcrypto.subtle}])test('unavailable or failed browser crypto refuses without send',async()=>{
 const d=new DiagnosticSession({crypto,send:()=>{throw Error('unexpected send');}});await d.submit(base);assert.equal(d.state.phase,'failed');assert.equal(evidence(d).length,0);if(!crypto?.getRandomValues)assert.equal(d.state.error,'browser_crypto_unavailable');
});
test('failure of the nonce draw after a successful trial identifier never falls back',async()=>{
 let draws=0,calls=0;const crypto={getRandomValues:b=>{if(++draws===2)throw Error('nonce generator unavailable');return webcrypto.getRandomValues(b);},subtle:webcrypto.subtle};
 const d=new DiagnosticSession({crypto,send:async()=>{calls++;return {};}});await d.submit(base);
 assert.equal(draws,2);assert.equal(calls,0);assert.equal(d.state.phase,'failed');assert.equal(d.state.error,'diagnostic_preparation_failed');assert.equal(evidence(d).length,0);
});
test('short has no pack; full has exact unmodified projection after identical envelope position',async()=>{
 const p=await pack();const d=new DiagnosticSession({send:async()=>({})});await d.submit(base);await d.submit({...base,mode:'full',packSession:p});
 const [a,b]=evidence(d);assert.equal(a.text.split('\n\n').slice(1).join('\n\n'),'');
 assert.equal(b.text.slice(b.text.indexOf('\n\n')+2),p.state.text);assert.equal(b.packId,p.state.view.pack.packId);
 const invalid=new DiagnosticSession({send:()=>{throw Error('must not send');}});
 await assert.rejects(invalid.submit({...base,mode:'full'}),/verified_preview_required/);
 await assert.rejects(invalid.submit({...base,mode:'full',lang:'en',packSession:p}),/verified_preview_required/);
 for(const change of [{connected:false},{textCapability:false},{lang:'de'},{mode:'fragments'}])await assert.rejects(invalid.submit({...base,...change}));
});
test('actual UTF-8 limit includes envelope; no truncated or oversized send',async()=>{
 assert.equal(assertContextSize('\u00e9'.repeat(MAX_CONTEXT_BYTES/2)),MAX_CONTEXT_BYTES);
 assert.throws(()=>assertContextSize('\u00e9'.repeat(MAX_CONTEXT_BYTES/2)+'x'),/no_truncation/);
 const p=await pack();p.state.text='x'.repeat(MAX_CONTEXT_BYTES);let calls=0;
 const d=new DiagnosticSession({send:async()=>{calls++;return {};}});await d.submit({...base,mode:'full',packSession:p});
 assert.equal(calls,0);assert.equal(d.state.error,'complete_context_exceeds_limit_no_truncation');assert.equal(evidence(d).length,0);
});
test('invalidating while digest is pending cannot submit the stale selection',async()=>{
 let finish;const crypto={getRandomValues:b=>webcrypto.getRandomValues(b),subtle:{digest:()=>new Promise(r=>finish=r)}};let calls=0;
 const d=new DiagnosticSession({crypto,send:()=>{calls++;return {};}});const pending=d.submit(base);d.invalidate();finish(new ArrayBuffer(32));await pending;assert.equal(calls,0);assert.equal(d.state.phase,'idle');
});
for(const outcome of ['ack','error'])test('late acknowledgement cannot accept another trial: '+outcome,async()=>{
 const pending=[];const d=new DiagnosticSession({send:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))});
 const first=d.submit(base);while(!pending.length)await new Promise(r=>setTimeout(r,0));
 await assert.rejects(d.submit(base),/in_progress/);d.invalidate();const second=d.submit(base);while(pending.length<2)await new Promise(r=>setTimeout(r,0));
 if(outcome==='ack')pending[0].resolve({});else pending[0].reject(Error('sensitive text'));
 await first;assert.equal(d.state.phase,'submitted');assert.equal(d.state.trialId,evidence(d)[1].trialId);pending[1].resolve({});await second;assert.equal(d.state.phase,'acknowledged');
});
test('selection races and disconnect invalidation cannot be acknowledged',async()=>{
 const p=await pack();let finish;const d=new DiagnosticSession({send:()=>new Promise(r=>finish=r)});const pending=d.submit({...base,mode:'full',packSession:p});
 while(!finish)await new Promise(r=>setTimeout(r,0));p.select({...selection,lang:'en'});d.invalidate();finish({});await pending;assert.equal(d.state.phase,'idle');
});
test('echoed host errors never leak nonce through public status',async()=>{
 const d=new DiagnosticSession({send:async text=>{throw Error(text);}});await d.submit(base);assert.equal(d.state.error,'transmission_unconfirmed');assert.equal(JSON.stringify(d.state).includes(evidence(d)[0].expected),false);
});
test('reload restores observer evidence only, no acceptance or update; storage denial is explicit',async context=>{
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let calls=0;
 const d=new DiagnosticSession({storage,send:async()=>{calls++;return {};}});await d.submit(base);assert.equal(d.state.observerStorage,true);
 // Drain both microtasks and scheduled callbacks: a synchronous assertion misses replay.
 context.mock.timers.enable({apis:['setTimeout','setInterval','setImmediate']});
 const reloaded=new DiagnosticSession({storage,send:()=>{calls++;return {};}});
 await Promise.resolve();context.mock.timers.runAll();await Promise.resolve();assert.equal(calls,1);assert.equal(reloaded.state.phase,'idle');assert.deepEqual(evidence(reloaded),evidence(d));
 reloaded.invalidate();await Promise.resolve();context.mock.timers.runAll();await Promise.resolve();assert.equal(calls,1);context.mock.timers.reset();
 const denied=new DiagnosticSession({storage:{getItem:()=>{throw Error();},setItem:()=>{throw Error();}},send:async()=>({})});await denied.submit(base);assert.equal(denied.state.observerStorage,false);
});
