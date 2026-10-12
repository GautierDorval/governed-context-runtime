// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDemo} from './demo.mjs';
import {canonical,unitPreimage} from '../reference/verification.mjs';
import {inspectVerifiedUnit} from './verified-unit.mjs';
const bundle=await loadDemo(),unit=bundle.snapshot.inventory.units[0];
const input=()=>({snapshotBytes:canonical(bundle.snapshot),unitBytes:canonical(unit),expectedRoot:bundle.policy.expectedRoot,expectedIntents:bundle.expectedIntents,getArchive:uri=>Buffer.from(bundle.archives[uri],'base64')});
test('complete snapshot binds unit and exposes recipe-derived coverage',async()=>{
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
test('missing or divergent local root rejects before archive access',async()=>{
 for(const expectedRoot of [undefined,'sha-256:'+'0'.repeat(64)]){
  let touched=false;await assert.rejects(()=>inspectVerifiedUnit({...input(),expectedRoot,getArchive:()=>{touched=true;throw Error('must not read');}}),/pinned_root_required|unexpected_corpus_root/);assert.equal(touched,false);
 }
});
test('altered archive is rejected',async()=>{
 await assert.rejects(()=>inspectVerifiedUnit({...input(),getArchive:()=>Buffer.from('{}')}),/archive-envelope/);
});
test('unlisted unit rejected even if all snapshot checks pass',async()=>{
 await assert.rejects(()=>inspectVerifiedUnit({...input(),unitBytes:canonical({...unit,unitId:'unknown'})}),/unit_snapshot_membership/);
});
