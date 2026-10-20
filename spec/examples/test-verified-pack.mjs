// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDemo} from './demo.mjs';
import {canonical,strictParse,digest} from '../reference/verification.mjs';
import {inspectVerifiedPack,consumeVerifiedPack} from './verified-pack.mjs';
const b=await loadDemo();
const input=()=>({snapshotBytes:canonical(b.snapshot),getArchive:uri=>{if(!Object.hasOwn(b.archives,uri)){const e=Error('missing_archive');e.name='VerificationError';throw e;}return Buffer.from(b.archives[uri],'base64');},expectedRoot:b.policy.expectedRoot,expectedIntents:b.expectedIntents,intentToken:'representation-gap',lang:'en',version:b.snapshot.inventory.packs[0].version});
for(const lang of ['fr','en'])test('exact whole pack selection '+lang,async()=>{
 const result=await inspectVerifiedPack({...input(),lang});
 assert.equal(result.pack.lang,lang);assert.equal(result.pack.packId,result.manifest.packId);
 assert(result.units.length>0);assert(result.sources.length>0);
 assert.equal(result.verification.signatureTrust,'not-established');assert.equal(result.verification.usePermission,'not-evaluated');
 assert.equal(result.units[0].selectedValue,false);
 for(const field of ['causalContexts','applicabilityChains','weightingRules','answerBoundaries'])assert(Array.isArray(result.pack[field]));
});
for(const expectedRoot of [undefined,'','sha-256:'+'0'.repeat(64)])test('root refuses before reader: '+expectedRoot,async()=>{
 let reads=0;await assert.rejects(()=>inspectVerifiedPack({...input(),expectedRoot,getArchive:()=>{reads++;throw Error('not reached');}}),/pinned_root_required|unexpected_corpus_root/);assert.equal(reads,0);
});
for(const change of [{intentToken:'unknown'},{lang:'de'},{version:'999.0.0'}])test('no selection fallback '+JSON.stringify(change),async()=>{
 await assert.rejects(()=>inspectVerifiedPack({...input(),...change}),/exact_pack_not_found/);
});
test('altered or missing archive cannot produce a pack',async()=>{
 await assert.rejects(()=>inspectVerifiedPack({...input(),getArchive:()=>Buffer.from('{}')}),/archive-envelope/);
 await assert.rejects(()=>inspectVerifiedPack({...input(),getArchive:()=>{const e=Error('missing_archive');e.name='VerificationError';throw e;}}),/missing_archive/);
});
test('private archive copies survive caller changes and no second retrieval occurs',async()=>{
 const reads=new Set();let previous;
 const result=await inspectVerifiedPack({...input(),getArchive:uri=>{
  assert(!reads.has(uri));reads.add(uri);if(previous)previous.fill(0);
  previous=Buffer.from(b.archives[uri],'base64');return previous;
 }});previous.fill(0);
 assert.equal(reads.size,b.snapshot.inventory.items.length);assert.equal(result.units[0].selectedValue,false);
});
test('snapshot and selection are captured before asynchronous archive reader',async()=>{
 const args=input();const expected=args.snapshotBytes.slice();let release;
 const barrier=new Promise(resolve=>{release=resolve;});let first=true;
 args.getArchive=async uri=>{if(first){first=false;await barrier;}return Buffer.from(b.archives[uri],'base64');};
 const pending=inspectVerifiedPack(args);args.snapshotBytes.fill(0);args.lang='fr';release();
 const result=await pending;assert.equal(result.pack.lang,'en');assert.equal(strictParse(expected).corpusRootDigest,result.verification.corpusRootDigest);
});
test('inventory and registry disagreement under a newly admitted root still refuses',async()=>{
 const snapshot=structuredClone(b.snapshot);snapshot.inventory.packs[0].version='999.0.0';
 snapshot.corpusRootDigest=await digest(canonical(snapshot.inventory));snapshot.snapshotId='governed-context-runtime:'+snapshot.corpusRootDigest;
 await assert.rejects(()=>inspectVerifiedPack({...input(),snapshotBytes:canonical(snapshot),expectedRoot:snapshot.corpusRootDigest}),/pack-registry/);
});
const consumed=async(edit=()=>{})=>{
 const args={...input(),policy:structuredClone(b.policy),receipt:structuredClone(b.receipt)};edit(args);let calls=0;
 const result=await consumeVerifiedPack(args,pack=>{calls++;return {packId:pack.pack.packId};});
 return {result,calls};
};
test('only admitted complete pack crosses fictional consumption boundary',async()=>{
 const {result,calls}=await consumed();assert.equal(calls,1);assert.equal(result.delivered,true);assert.equal(result.result.verification.usePermission,'inspect-context');
});
for(const [name,edit] of Object.entries({archive:a=>{a.getArchive=()=>Buffer.from('{}');},root:a=>{a.policy.expectedRoot='sha-256:'+'0'.repeat(64);},key:a=>{a.policy.allowedKids=[];},expired:a=>{a.policy.now+=7200;},purpose:a=>{a.purpose='execute';},selection:a=>{a.lang='de';},revoked:a=>{a.policy.keys[0].status='revoked';}}))test('refusal never reaches consumer: '+name,async()=>{
 const {result,calls}=await consumed(edit);assert.equal(calls,0);assert.equal(result.delivered,false);assert.equal(result.status,'REFUSED');
});
test('policy capture, next-call revocation and decision replay remain separate',async()=>{
 const args={...input(),policy:structuredClone(b.policy),receipt:b.receipt};let calls=0;
 const pending=consumeVerifiedPack(args,()=>{calls++;});
 args.policy.keys[0].status='revoked';
 assert.equal((await pending).delivered,true);
 assert.equal((await consumeVerifiedPack(args,()=>{calls++;})).delivered,false);
 assert.equal(calls,1);
 const prior=(await consumed()).result.decision;
 const replay=await consumeVerifiedPack({...args,policy:b.policy,receipt:prior},()=>{calls++;});
 assert.equal(replay.delivered,false);assert.equal(calls,1);
});

test('receipt bytes are captured before the first asynchronous policy check',async()=>{
 const receipt=structuredClone(b.receipt);let calls=0;
 const pending=consumeVerifiedPack({...input(),policy:b.policy,receipt},()=>{calls++;});
 receipt.detachedJws='changed-after-call';receipt.payloadBase64='changed-after-call';
 const result=await pending;assert.equal(result.delivered,true);assert.equal(calls,1);
 const next=await consumeVerifiedPack({...input(),policy:b.policy,receipt},()=>{calls++;});
 assert.equal(next.delivered,false);assert.equal(calls,1);
});
test('malformed invocation and non-cloneable inputs reject without calling consumer',async()=>{
 let calls=0;
 await assert.rejects(()=>consumeVerifiedPack({...input(),policy:()=>{},receipt:b.receipt},()=>{calls++;}),{name:'DataCloneError'});
 await assert.rejects(()=>consumeVerifiedPack({...input(),snapshotBytes:'not bytes',policy:b.policy,receipt:b.receipt},()=>{calls++;}),/bytes_required/);
 assert.equal(calls,0);
});
