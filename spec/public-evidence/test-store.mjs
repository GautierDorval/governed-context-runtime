// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {storeCandidate,verifyStoredBundle} from './store.mjs';
import {publicationId} from './verify.mjs';
import {syntheticPublication} from './fixture.mjs';
const clock={checkedAt:'2026-10-10T12:00:00.000Z'};
const directory=()=>fs.mkdtemp(path.join(os.tmpdir(),'runtime-public-store-'));
test('immutable content verified before atomic pointer, then explicit unchanged',async()=>{const root=await directory(),p=await syntheticPublication();assert.equal((await storeCandidate(root,p,clock)).status,'STORED_LOCAL_CANDIDATE');const before=await fs.readFile(path.join(root,'current.json'));const r=await storeCandidate(root,p,{checkedAt:'2026-10-11T12:00:00.000Z'});assert.equal(r.status,'UNCHANGED');assert.equal(r.observationsChanged,false);assert.deepEqual(await fs.readFile(path.join(root,'current.json')),before);assert.equal((await verifyStoredBundle(path.join(root,p.publicationId.slice(8)))).publicationId,p.publicationId)});
test('interruption leaves last valid pointer intact and records non-storage',async()=>{const root=await directory(),p=await syntheticPublication();await storeCandidate(root,p,clock);const before=await fs.readFile(path.join(root,'current.json'));p.observations[0].metrics[0].value=2;p.observations[0].metrics[0].status='measured';p.publicationId=await publicationId(p);assert.equal((await storeCandidate(root,p,{...clock,failBeforePointer:true})).status,'NOT_STORED');assert.deepEqual(await fs.readFile(path.join(root,'current.json')),before);assert.equal((await storeCandidate(root,p,clock)).status,'STORED_LOCAL_CANDIDATE')});
test('nonmeasurement identity change never claims new observations',async()=>{const root=await directory(),p=await syntheticPublication();await storeCandidate(root,p,clock);p.policyDigest='sha-256:'+'c'.repeat(64);p.publicationId=await publicationId(p);const r=await storeCandidate(root,p,clock);assert.equal(r.status,'STORED_LOCAL_CANDIDATE');assert.equal(r.observationsChanged,false)});
test('partial or additional files cannot be promoted as an existing immutable bundle',async()=>{const root=await directory(),p=await syntheticPublication();await storeCandidate(root,p,clock);await fs.writeFile(path.join(root,p.publicationId.slice(8),'private.json'),'{}');assert.equal((await storeCandidate(root,p,clock)).status,'NOT_STORED')});
test('concurrent writer is refused without changing its lock',async()=>{const root=await directory(),p=await syntheticPublication();await fs.writeFile(path.join(root,'.writer-lock'),'other');assert.equal((await storeCandidate(root,p,clock)).reason,'WRITER_BUSY');assert.equal(await fs.readFile(path.join(root,'.writer-lock'),'utf8'),'other')});
test('invalid source cannot create a pointer',async()=>{const root=await directory(),p=await syntheticPublication();p.observations[0].reasonCode=null;await assert.rejects(storeCandidate(root,p,clock),/REASON_REQUIRED/);assert.deepEqual(await fs.readdir(root),[])});

test('suppression cannot be reversed through an intervening edition with no row',async()=>{
 const root=await directory(),p=await syntheticPublication();
 Object.assign(p.observations[0].metrics[0],{value:null,valueType:'withheld',status:'withheld',publicationStatus:'withheld',withholdingReason:'family_suppressed'});
 p.publicationId=await publicationId(p);await storeCandidate(root,p,clock);
 const empty=structuredClone(p);empty.observations=[];empty.coverage.status='partial';empty.coverage.missing=['2026-09-07'];empty.publicationId=await publicationId(empty);
 assert.equal((await storeCandidate(root,empty,clock)).status,'STORED_LOCAL_CANDIDATE');
 const disclosed=await syntheticPublication();const before=await fs.readFile(path.join(root,'current.json'));
 const result=await storeCandidate(root,disclosed,clock);
 assert.equal(result.status,'NOT_STORED');assert.equal(result.reason,'CROSS_RELEASE_DISCLOSURE');assert.deepEqual(await fs.readFile(path.join(root,'current.json')),before);
});
