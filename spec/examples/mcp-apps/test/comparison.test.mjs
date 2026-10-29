// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareCatalog,loadComparisonEntry,comparisonCatalog} from '../comparison-data.mjs';
import {compareAdmitted,rawDifference,normalizeDelta} from '../comparison.mjs';
import {admitComparison,validateDocument,assertComplexity,LIMITS} from '../comparison-admission.mjs';
import {buildComparisonFixture} from '../comparison-fixture.mjs';
import {ComparisonSession} from '../comparison-session.mjs';
import {PackSession} from '../session.mjs';
import {runComparison} from '../comparison-runner.mjs';
import {canonical,strictParse} from '../reference/spec/reference/verification.mjs';
const base=JSON.parse(await readFile(new URL('../reference/spec/examples/semantic-boundaries/bundle.json',import.meta.url)));
const anchor=JSON.parse(await readFile(new URL('../reference/spec/examples/semantic-boundaries/expected-root.json',import.meta.url)));
const entry=base.snapshot.inventory.packs.find(p=>p.lang==='fr');
const input=(bundle=base)=>({snapshotBytes:canonical(bundle.snapshot),getArchive:uri=>{if(!bundle.archives[uri])throw Error('archive_missing');return Buffer.from(bundle.archives[uri],'base64');},
 expectedRoot:anchor.expectedRoot,rootProvenance:'retained separate teaching anchor',expectedIntents:bundle.expectedIntents,intentToken:entry.intentToken,lang:'fr',version:entry.version,fictional:true});
const normalized=(a,b)=>normalizeDelta(rawDifference(a,b),a,b);
const reference=await loadComparisonEntry('reference-fr');
for(const lang of ['fr','en']){
 test('admitted complete comparison, every raw branch and report operation covered '+lang,async()=>{
  const r=await compareCatalog('reference-'+lang,'variant-'+lang);
  assert.equal(r.status,'complete');assert.ok(r.operations.length>20);assert.deepEqual([...r.rawCoverage.branches].sort(),[...r.rawCoverage.consumed].sort());
  assert.deepEqual(r.operations.map(o=>o.id).sort(),r.groups.flatMap(g=>g.operationIds).sort());
  for(const path of ['/pack/requiredEvidence','/pack/applicabilityChains/0/requiredEvidence','/pack/causalContexts/0/forbidden_derivations'])assert.ok(r.operations.some(o=>(o.pathB??o.pathA).startsWith(path)));
  assert.equal(r.coherence.A.status,'satisfied');assert.equal(r.coherence.B.status,'satisfied');
  assert.ok(r.operations.some(o=>o.pathB==='/sources/0/contentBase64'||o.pathB?.startsWith('/sources/')));
  assert.equal(r.A.schemaConformance,'validated');assert.equal(r.A.integrity.signatureTrust,'not-established');
  assert.deepEqual(r,await compareCatalog('reference-'+lang,'variant-'+lang),'deterministic without an execution clock');
 });
 test('identical entries have zero structural operations '+lang,async()=>{
  const r=await compareCatalog('reference-'+lang,'reference-'+lang);assert.deepEqual(r.operations,[]);assert.deepEqual(r.equality,{packBytes:true,packStructure:true});
 });
}
test('only admitted objects may enter the qualified comparator',()=>assert.throws(()=>compareAdmitted(structuredClone(reference),reference),/admitted_entries/));
test('wrong root, missing archive, exact selection and root provenance each refuse',async()=>{
 await assert.rejects(admitComparison({...input(),expectedRoot:'sha-256:'+'0'.repeat(64)}),/unexpected_corpus_root/);
 await assert.rejects(admitComparison({...input(),getArchive:()=>{throw Error('archive_missing');}}),/archive_missing/);
 await assert.rejects(admitComparison({...input(),version:'absent'}),/exact_pack_not_found/);
 await assert.rejects(admitComparison({...input(),rootProvenance:''}),/provenance_required/);
});
test('strict parsing refuses malformed, duplicate and excessive-depth documents',()=>{
 for(const value of ['{"x":1,"x":2}','{"x":','['.repeat(70)+'0'+']'.repeat(70)])assert.throws(()=>strictParse(Buffer.from(value)));
});
test('schema validation is not a version label check',()=>{
 for(const mutate of [p=>{p.schemaVersion='future';},p=>{p.activationConditions=1;},p=>{p.extra='unexpected';},p=>{delete p.requiredEvidence;}]){
  const p=structuredClone(reference.scope.pack);mutate(p);assert.throws(()=>validateDocument('context-pack.schema.json',p),/schema_nonconformant/);
 }
 assert.throws(()=>validateDocument('other.schema.json',{}),/unsupported_schema/);
});
test('integrity-valid closed-schema violation is still refused',async()=>{
 const b=await buildComparisonFixture({changePack:p=>{p.extra='integrity does not validate schema';}});
 await assert.rejects(admitComparison({...input(b),expectedRoot:b.snapshot.corpusRootDigest,version:'comparison-example-2'}),/schema_nonconformant/);
});
test('same version with different content remains comparable under distinct anchors',async()=>{
 const b=await buildComparisonFixture({version:entry.version});
 const admitted=await admitComparison({...input(b),expectedRoot:b.snapshot.corpusRootDigest});
 const r=compareAdmitted(reference,admitted);
 assert.equal(r.A.selection.version,r.B.selection.version);assert.notEqual(r.A.packBytesDigest,r.B.packBytesDigest);assert.ok(r.operations.length);
});
test('different languages and unknown catalog entries refuse',async()=>{
 await assert.rejects(compareCatalog('reference-fr','reference-en'),/incompatible_lang|incompatible_packId/);
 await assert.rejects(loadComparisonEntry('nearest'),/not_admitted/);
});
test('string list insertion, removal, rewrite and multiplicity preserve occurrences',()=>{
 const head=normalized({x:['a','b']},{x:['new','a','b']}).operations;assert.equal(head.length,1);assert.equal(head[0].kind,'add');assert.equal(head[0].pathB,'/x/0');
 const rewrite=normalized({x:['old']},{x:['new']}).operations;assert.deepEqual(rewrite.map(o=>o.kind).sort(),['add','remove']);
 const multiple=normalized({x:['a']},{x:['a','a','a']}).operations;assert.equal(multiple.length,2);
});
test('duplicate reorder is marked ambiguous and preserves actual positions',()=>{
 const ops=normalized({x:['x','y','x']},{x:['x','x','y']}).operations;
 assert.ok(ops.some(o=>o.kind==='order'&&o.ambiguous));assert.ok(ops.every(o=>o.pathA&&o.pathB));
});
test('identified move plus text change keeps both dimensions; keys are scoped',()=>{
 const a={pack:{answerBoundaries:[{ruleId:'one',rule:'old'},{ruleId:'two',rule:'same'}],weightingRules:[{ruleId:'one',rule:'separate'}]}};
 const b=structuredClone(a);b.pack.answerBoundaries.reverse();b.pack.answerBoundaries[1].rule='new';
 const ops=normalized(a,b).operations;
 assert.ok(ops.some(o=>o.kind==='order'));assert.ok(ops.some(o=>o.kind==='replace'&&o.before==='old'&&o.after==='new'));
 for(const list of [[{ruleId:'x'},{ruleId:'x'}],[{rule:'missing'}]])assert.throws(()=>rawDifference({pack:{answerBoundaries:list}},b),/matching_key_missing_or_duplicate/);
});
test('unkeyed selected-value objects use complete value matching, not invented persistent keys',()=>{
 const ops=normalized({x:[{id:'same',text:'old'}]},{x:[{id:'same',text:'new'}]}).operations;
 assert.deepEqual(ops.map(o=>o.kind).sort(),['add','remove']);
});
test('null, empty, absent fields, nested paths and all field changes survive normalization',()=>{
 const a={'a/b~c':{x:null,blank:'',list:[],remove:false}},b={'a/b~c':{x:'',blank:null,list:['x'],new:0}};
 const n=normalized(a,b);assert.equal(n.operations.length,5);
 assert.ok(n.operations.every(o=>(o.pathA??o.pathB).startsWith('/a~1b~0c/')));
 assert.ok(n.operations.some(o=>o.before===false&&!Object.hasOwn(o,'after')));
});
test('unknown delta branches and text patch forms cannot vanish from coverage',()=>{
 assert.throws(()=>normalizeDelta({x:[1,2,2]},{x:1},{x:2}),/unsupported_delta/);
 assert.throws(()=>normalizeDelta({x:{_t:'invalid'}},{x:[]},{x:[]}),/unknown_delta_marker/);
 assert.throws(()=>normalizeDelta({x:{_t:'a',unexpected:[1]}},{x:[]},{x:[1]}),/unknown_array_branch/);
});
test('strings stay atomic after shared text engine initialization; deltas do not alias inputs',async()=>{
 const {diff}=await import('jsondiffpatch/with-text-diffs');diff('a'.repeat(90),'b'.repeat(90));
 const a={hash:'sha-256:'+'a'.repeat(64)},b={hash:'sha-256:'+'b'.repeat(64)};
 const d=rawDifference(a,b);assert.equal(d.hash.length,2);
 const target={x:{nested:['original']}};const addition=rawDifference({},target);addition.x[0].nested[0]='changed';assert.equal(target.x.nested[0],'original');
 const before=JSON.stringify(reference);const report=compareAdmitted(reference,reference);report.context.A.pack.activationConditions.push('derived edit');assert.equal(JSON.stringify(reference),before);
});
test('complexity boundaries refuse without truncation',async()=>{
 assert.doesNotThrow(()=>assertComplexity(Array(LIMITS.arrayLength).fill(0)));
 assert.throws(()=>assertComplexity(Array(LIMITS.arrayLength+1).fill(0)),/array_limit/);
 await assert.rejects(admitComparison({...input(),snapshotBytes:Buffer.alloc(LIMITS.snapshotBytes+1)}),/snapshot_size_limit/);
 assert.throws(()=>assertComplexity([1,2],{...LIMITS,nodes:2}),/complexity_limit/);
});
test('fixture regeneration matches retained comparison example exactly',async()=>{
 assert.deepEqual(await buildComparisonFixture(),JSON.parse(await readFile(new URL('../comparison-example.json',import.meta.url))));
});
const selection=id=>comparisonCatalog.find(c=>c.id===id);
const reply=async(A,B)=>({_meta:{gcr:{comparison:await compareCatalog(A,B)}}});
for(const invalidation of ['select','disconnect','cancel'])test('late comparison cannot certify changed state: '+invalidation,async()=>{
 let finish;const s=new ComparisonSession({load:()=>new Promise(r=>finish=r)});s.select(selection('reference-fr'),selection('variant-fr'));const pending=s.compare();
 if(invalidation==='select')s.select(selection('reference-en'),selection('variant-en'));else s.invalidate(invalidation==='disconnect'?'disconnected':'selected');
 const state=structuredClone(s.state);finish(await reply('reference-fr','variant-fr'));await pending;assert.deepEqual(s.state,state);
});
test('wrong pair, missing result and errors never become zero changes',async()=>{
 for(const load of [()=>reply('reference-en','variant-en'),async()=>({}),async()=>{throw Error('timeout');}]){
  const s=new ComparisonSession({load});s.select(selection('reference-fr'),selection('variant-fr'));await s.compare();assert.equal(s.state.phase,'failed');assert.equal(s.state.report,null);
 }
});
test('comparison cannot release a pending full-read lock',async()=>{
 let finish;const pack=new PackSession({request:()=>new Promise(r=>finish=r)});pack.state={...pack.state,phase:'displayed',selection:{intentToken:'representation-gap',lang:'fr',version:entry.version,expectedRoot:anchor.expectedRoot}};
 const pending=pack.requestRead();const comparison=new ComparisonSession({load:reply});
 comparison.select(selection('reference-fr'),selection('variant-fr'));await comparison.compare();comparison.invalidate();
 assert.equal(pack.readPending,true);await assert.rejects(pack.requestRead(),/verified_preview_required/);finish({});await pending;assert.equal(pack.readPending,false);
});
test('worker deadline and cancellation refuse; next normal request succeeds',{timeout:20000},async()=>{
 await assert.rejects(runComparison('reference-fr','variant-fr',{timeout:1}),/timeout/);
 const control=new AbortController();const request=runComparison('reference-fr','variant-fr',{signal:control.signal});control.abort();await assert.rejects(request,/cancelled/);
 assert.equal((await runComparison('reference-fr','variant-fr')).status,'complete');
});


test('different exact bytes can describe equal pack structure',async()=>{
 const first=await buildComparisonFixture();
 const second=await buildComparisonFixture({encodePack:p=>Buffer.from(JSON.stringify(p)+'\n')});
 const admit=b=>admitComparison({...input(b),expectedRoot:b.snapshot.corpusRootDigest,version:'comparison-example-2'});
 const r=compareAdmitted(await admit(first),await admit(second));
 assert.equal(r.equality.packStructure,true);assert.equal(r.equality.packBytes,false);
 assert.notEqual(r.A.packBytesDigest,r.B.packBytesDigest);assert.equal(r.A.payloadDigest,r.B.payloadDigest);
 assert.ok(r.operations.every(o=>!o.pathA?.startsWith('/pack/')&&!o.pathB?.startsWith('/pack/')));
});
test('declared fictional root-chain divergence remains visible',async()=>{
 const b=await buildComparisonFixture({changePack:p=>p.requiredEvidence.push('Root-only divergence')});
 const other=await admitComparison({...input(b),expectedRoot:b.snapshot.corpusRootDigest,version:'comparison-example-2'});
 const r=compareAdmitted(reference,other);assert.equal(r.coherence.B.status,'divergence');
 assert.ok(r.coherence.B.relations.some(rel=>!rel.matches));
});
test('selection invalidation requests cancellation without reopening a pending read',async()=>{
 let signal;
 const s=new ComparisonSession({load:(_a,_b,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled'))));}});
 s.select(selection('reference-fr'),selection('variant-fr'));const request=s.compare();assert.equal(signal.aborted,false);
 s.invalidate();await request;assert.equal(signal.aborted,true);assert.equal(s.state.report,null);
});

test('every declared scope and boundary location survives normalization',()=>{
 const paths=[
 ['pack','activationConditions'],['pack','nonApplicabilityConditions'],['pack','requiredEvidence'],['pack','forbiddenInferences'],['pack','applicabilityAbuseBoundaries'],
 ['pack','applicabilityChains',0,'requiredEvidence'],['pack','causalContexts',0,'forbidden_derivations'],
 ['pack','answerBoundaries',0,'rule'],['pack','weightingRules',0,'rule'],['manifest','payloadUrl'],['manifest','canonicalizationPolicyId'],
 ['units',0,'unit','digest'],['sources',0,'contentBase64']
 ];
 for(const parts of paths){
  const a=structuredClone(reference.scope),b=structuredClone(a);let target=b;
  for(const part of parts.slice(0,-1))target=target[part];
  const last=parts.at(-1);target[last]=Array.isArray(target[last])?[...target[last],'changed occurrence']:'changed scalar';
  const path='/'+parts.join('/'),n=normalized(a,b);
  assert.ok(n.operations.some(o=>(o.pathB??o.pathA).startsWith(path)),path);
  assert.deepEqual([...n.rawCoverage.branches].sort(),[...n.rawCoverage.consumed].sort());
 }
});
test('source references and digest recipes remain separate dimensions',()=>{
 const a={sources:[{sourcePath:'archive',url:'https://example.invalid/a',contentBase64:'c2FtZQ==',repositoryDigest:'sha-256:'+'a'.repeat(64),digestScope:'repository-bytes'}]};
 const b=structuredClone(a);b.sources[0].url='https://example.invalid/b';
 assert.deepEqual(normalized(a,b).operations.map(o=>o.pathB),['/sources/0/url']);
 b.sources[0].digestScope='other-scope';assert.ok(normalized(a,b).operations.some(o=>o.pathB==='/sources/0/digestScope'));
 assert.equal(a.sources[0].contentBase64,b.sources[0].contentBase64);
});
test('reversed completions and late errors cannot overwrite the current pair',async()=>{
 const finish=[];const s=new ComparisonSession({load:()=>new Promise((resolve,reject)=>finish.push({resolve,reject}))});
 s.select(selection('reference-fr'),selection('variant-fr'));const old=s.compare();
 s.select(selection('reference-en'),selection('variant-en'));const current=s.compare();
 finish[1].resolve(await reply('reference-en','variant-en'));await current;const state=structuredClone(s.state);
 finish[0].reject(Error('late failure'));await old;assert.deepEqual(s.state,state);
});
test('patch-like data stays inert data',()=>{
 const a={x:{op:'remove',path:'/pack',value:{_t:'a',_0:['',1,3]}}},b=structuredClone(a);b.x.value._0[0]='changed';
 const original=JSON.stringify(a);assert.ok(normalized(a,b).operations.length);assert.equal(JSON.stringify(a),original);
});

test('literal _t object properties are fields, not array delta metadata',()=>{
 const n=normalized({object:{_t:'old'}},{object:{_t:'new'}});assert.equal(n.operations.length,1);assert.equal(n.operations[0].pathB,'/object/_t');assert.equal(n.operations[0].after,'new');
});
