// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDemo} from './demo.mjs';
import {canonical,digest,strictParse,unitPreimage,unitDigestCoverage} from '../reference/verification.mjs';
import {inspectVerifiedUnit} from './verified-unit.mjs';
const bundle=await loadDemo(),unit=bundle.snapshot.inventory.units[0];
const fromArchive=uri=>Buffer.from(bundle.archives[uri],'base64');
const input=()=>({snapshotBytes:canonical(bundle.snapshot),unitBytes:canonical(unit),expectedRoot:bundle.policy.expectedRoot,expectedIntents:bundle.expectedIntents,getArchive:fromArchive});
const rejectsBeforeArchive=async(expectedRoot,code)=>{
 let touched=false;await assert.rejects(()=>inspectVerifiedUnit({...input(),expectedRoot,getArchive:()=>{touched=true;throw Error('must not read');}}),code);assert.equal(touched,false);
};
// Rebuilds the fictional snapshot in memory after editing selected sources; fixture files stay unchanged.
const sourceOf=path=>Buffer.from(strictParse(fromArchive(bundle.snapshot.inventory.items.find(i=>i.sourcePath===path).uri)).contentBase64,'base64');
async function rebuilt(edits={},units){
 const snapshot=structuredClone(bundle.snapshot),archives={};
 for(const item of snapshot.inventory.items){
  const source=edits[item.sourcePath]?Buffer.from(edits[item.sourcePath](sourceOf(item.sourcePath).toString())):sourceOf(item.sourcePath);
  const envelope={...strictParse(fromArchive(item.uri)),contentBase64:source.toString('base64'),digest:await digest(source)};
  const bytes=canonical(envelope),archiveDigest=await digest(bytes);
  Object.assign(item,{repositoryDigest:envelope.digest,version:envelope.digest,byteLength:source.length,digest:archiveDigest,uri:'/v0/artifacts/'+archiveDigest.slice(8)});
  archives[item.uri]=Buffer.from(bytes);
 }
 if(units)snapshot.inventory.units=units(snapshot.inventory.units);
 snapshot.corpusRootDigest=await digest(canonical(snapshot.inventory));snapshot.snapshotId='governed-context-runtime:'+snapshot.corpusRootDigest;
 return {snapshot,archives};
}
const inspectRebuilt=({snapshot,archives},record=snapshot.inventory.units[0])=>inspectVerifiedUnit({snapshotBytes:canonical(snapshot),unitBytes:canonical(record),expectedRoot:snapshot.corpusRootDigest,expectedIntents:bundle.expectedIntents,getArchive:uri=>archives[uri]});
const editRecipe=change=>({'spec/governed-context-runtime/attestation-recipes.json':text=>{const recipes=JSON.parse(text);change(recipes.profiles[unit.canonicalization]);return JSON.stringify(recipes);}});
test('complete snapshot binds unit and exposes effective algorithm coverage',async()=>{
 const r=await inspectVerifiedUnit(input());assert.equal(r.verification.snapshotMembership,'verified-complete-record');
 assert.equal(r.verification.signatureTrust,'not-established');assert.equal(r.verification.usePermission,'not-evaluated');
 assert(r.verification.legacyDigest.recordFieldsCovered.includes('canonicalText'));
 assert(r.verification.legacyDigest.recordFieldsOutsideDigest.includes('selectedValueType'));
 assert(r.verification.legacyDigest.recordFieldsOutsideDigest.includes('forbiddenTransformations'));
 assert.equal(r.selectedValue,false);
});
for(const field of ['forbiddenTransformations','selectedValueType','canonicalText'])test('reject mismatched served unit: '+field,async()=>{
 const u=structuredClone(unit);u[field]=field==='forbiddenTransformations'?[]:'changed';
 await assert.rejects(()=>inspectVerifiedUnit({...input(),unitBytes:canonical(u)}),/unit_snapshot_membership/);
});
test('unchanged historical digest cannot hide transformation changes',async()=>{
 const u={...unit,forbiddenTransformations:[]};const source=Buffer.from('{"allowsAutonomy":false}');
 assert.deepEqual(unitPreimage(unit,source),unitPreimage(u,source));
 await assert.rejects(()=>inspectVerifiedUnit({...input(),unitBytes:canonical(u)}),/unit_snapshot_membership/);
});
test('missing or malformed local root rejects before archive access',async()=>{
 const root=bundle.policy.expectedRoot,hex=root.slice(8);
 for(const expectedRoot of [undefined,'',root.toUpperCase(),'sha-256:'+hex.toUpperCase(),'sha256:'+hex,hex,root+'\n'])await rejectsBeforeArchive(expectedRoot,/pinned_root_required/);
});
test('divergent local root rejects before archive access',async()=>{
 await rejectsBeforeArchive('sha-256:'+'0'.repeat(64),/unexpected_corpus_root/);
});
test('altered archive is rejected',async()=>{
 await assert.rejects(()=>inspectVerifiedUnit({...input(),getArchive:()=>Buffer.from('{}')}),/archive-envelope/);
});
test('unlisted unit rejected even if all snapshot checks pass',async()=>{
 await assert.rejects(()=>inspectVerifiedUnit({...input(),unitBytes:canonical({...unit,unitId:'unknown'})}),/unit_snapshot_membership/);
});
test('caller cannot change verified archive bytes before use',async()=>{
 const target=bundle.snapshot.inventory.items.find(i=>i.sourcePath===unit.sourcePath).uri;
 let held,tampered=false;
 const getArchive=uri=>{
  if(held){ // Rewrite the caller-owned buffer of an archive that was already verified.
   const view=new Uint8Array(held),text=Buffer.from(view).toString(),envelope=JSON.parse(text);
   const changed=Buffer.from(Buffer.from(envelope.contentBase64,'base64').toString().replace('"allowsAutonomy":false','"allowsAutonomy":true ')).toString('base64');
   assert.notEqual(changed,envelope.contentBase64);
   const bytes=Buffer.from(text.replace(envelope.contentBase64,changed));assert.equal(bytes.length,view.length);view.set(bytes);held=undefined;tampered=true;
  }
  const bytes=fromArchive(uri),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);
  if(uri===target)held=buffer;
  return buffer;
 };
 const r=await inspectVerifiedUnit({...input(),getArchive});
 assert.equal(tampered,true);assert.equal(r.selectedValue,false);
});
test('in-memory rebuild preserves the reference result',async()=>{
 assert.equal((await inspectRebuilt(await rebuilt())).selectedValue,false);
});
test('known v0 without optional declaration still reports its seven hashed fields',async()=>{
 const r=await inspectRebuilt(await rebuilt(editRecipe(profile=>{delete profile.requiredFieldsInPreimage;})));
 assert.deepEqual(r.verification.legacyDigest.recordFieldsCovered,['unitId','sourcePath','selector','claimClass','authorityScope','canonicalSource','canonicalText']);
 assert(r.verification.legacyDigest.recordFieldsOutsideDigest.includes('forbiddenTransformations'));
});
test('non-list coverage in the archived recipe is rejected',async()=>{
 const corpus=await rebuilt(editRecipe(profile=>{profile.requiredFieldsInPreimage=profile.requiredFieldsInPreimage.join('');}));
 await assert.rejects(()=>inspectRebuilt(corpus),/invalid_recipe_coverage/);
});
test('membership compares exact bytes without Unicode normalization',async()=>{
 const nfc='Café fictif.',nfd='Café fictif.',registry='public/attested-interpretive-units.json';
 const corpus=await rebuilt({[registry]:text=>{const j=JSON.parse(text);j.units[0].forbiddenTransformations=[nfc];return JSON.stringify(j);}},units=>{const copy=structuredClone(units);copy[0].forbiddenTransformations=[nfc];return copy;});
 assert.equal((await inspectRebuilt(corpus)).selectedValue,false);
 await assert.rejects(()=>inspectRebuilt(corpus,{...corpus.snapshot.inventory.units[0],forbiddenTransformations:[nfd]}),/unit_snapshot_membership/);
});

const actualV0=['unitId','sourcePath','selector','claimClass','authorityScope','canonicalSource','canonicalText'];
for(const [name,declared] of Object.entries({overstated:[...actualV0,'forbiddenTransformations','selectedValueType'],incomplete:actualV0.slice(1),empty:[],duplicate:[...actualV0,actualV0[0]],null:null,nonstring:[...actualV0,1]})) {
 test('v0 coverage rejects contradictory declaration: '+name,async()=>{
  const corpus=await rebuilt(editRecipe(profile=>{profile.requiredFieldsInPreimage=declared;}));
  assert.notEqual(corpus.snapshot.corpusRootDigest,bundle.policy.expectedRoot);
  await assert.rejects(()=>inspectRebuilt(corpus),/invalid_recipe_coverage/);
 });
}
test('v0 coverage permutation is accepted with stable effective order',async()=>{
 const r=await inspectRebuilt(await rebuilt(editRecipe(profile=>{profile.requiredFieldsInPreimage=actualV0.toReversed();})));
 assert.deepEqual(r.verification.legacyDigest.recordFieldsCovered,actualV0);
});
test('returned coverage cannot alter a later inspection',async()=>{
 const r=await inspectVerifiedUnit(input());
 try{r.verification.legacyDigest.recordFieldsCovered.push('forbiddenTransformations');}catch(e){assert(e instanceof TypeError);}
 assert.deepEqual((await inspectVerifiedUnit(input())).verification.legacyDigest.recordFieldsCovered,actualV0);
});
test('changed recipe under original root refuses before archives',async()=>{
 const corpus=await rebuilt(editRecipe(profile=>{profile.requiredFieldsInPreimage.push('forbiddenTransformations');}));
 let reads=0;
 await assert.rejects(()=>inspectVerifiedUnit({...input(),snapshotBytes:canonical(corpus.snapshot),getArchive:()=>{reads++;throw Error('unreachable');}}),/unexpected_corpus_root/);
 assert.equal(reads,0);
});

test('selected-value profiles never claim direct record coverage',()=>{
 for(const canonicalization of ['utf8-nfc-lf-trimmed-v0','deterministic-json-sort-keys-v0']){
  const u={digestScope:'selected_unit_only',canonicalization};
  assert.deepEqual(unitDigestCoverage(u,{}),[]);
  assert.deepEqual(unitDigestCoverage(u,{requiredFieldsInPreimage:[]}),[]);
  for(const requiredFieldsInPreimage of [['canonicalText'],['selectedValueType'],null,''])
   assert.throws(()=>unitDigestCoverage(u,{requiredFieldsInPreimage}),/invalid_recipe_coverage/);
 }
 assert.throws(()=>unitDigestCoverage({digestScope:'selected_unit_only',canonicalization:'unknown'},{}),/unknown_profile/);
 assert.throws(()=>unitDigestCoverage(unit,undefined),/unknown_profile/);
});
