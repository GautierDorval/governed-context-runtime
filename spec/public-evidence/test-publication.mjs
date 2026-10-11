// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,VERSION,publicationId,verifyPublication,validateContent} from './verify.mjs';
import {syntheticPublication} from './fixture.mjs';
test('public fixture validates without private source or secret',async()=>{const p=await syntheticPublication();assert.equal((await verifyPublication(p)).status,'VERIFIED_PUBLIC_PROJECTION');assert.equal(p.observations[0].reportStatus,'partial');assert.equal(p.observations[0].metrics[0].status,'measured_zero')});
for(const [name,mutate,code] of [
 ['wrong version',p=>p.schema='future/9','PUBLIC_VERSION'],
 ['qualification removed',p=>p.observations[0].qualifications.pop(),'QUALIFICATIONS'],
 ['unknown private field',p=>p.privatePath='C:/private','PUBLIC_FIELDS'],
 ['false completeness',p=>p.observations=[],'COVERAGE_FALSE_COMPLETE'],
 ['overlapping duplicate',p=>p.observations.push(p.observations[0]),'ROW_DATE_ORDER'],
 ['non-synthetic attribution',p=>p.observations[0].population='external-agents','POPULATION'],
 ['UTC ambiguity',p=>p.observations[0].capturedAt='2026-09-08T12:00:00-04:00','OBSERVATION_TIMESTAMPS'],
 ['active version inference',p=>p.observations[0].measurementEpoch='active','MEASUREMENT_EPOCH'],
 ['private reason identifier',p=>p.observations[0].reasonCode='AS13335','REASON_CODE'],
 ['private reason URL',p=>p.observations[0].reasonCode='https://private.example','REASON_CODE'],
 ['null as zero',p=>p.observations[0].metrics[0].value=null,'COUNT_VALUE'],
 ['withheld as measured',p=>p.observations[0].metrics[0].publicationStatus='withheld','WITHHOLDING_STATUS'],
 ['lost partial reason',p=>p.observations[0].reasonCode=null,'REASON_REQUIRED'],
 ['implicit ratio denominator',p=>p.observations[0].metrics[0].unit='ratio','METRIC_DEFINITION'],
 ['unknown status',p=>p.observations[0].reportStatus='certified','REPORT_STATUS']]){
 test(name+' remains rejected even with a recomputed digest',async()=>{const p=await syntheticPublication();mutate(p);p.publicationId=await publicationId(p);await assert.rejects(verifyPublication(p),e=>e.code===code)});
}
test('private digest cannot stand in for redacted publication bytes',async()=>{const p=await syntheticPublication();p.publicationId=p.corpusRootDigest;await assert.rejects(verifyPublication(p),/PUBLIC_DIGEST/)});
test('verification clock is separate from repeatable content',async()=>{const p=await syntheticPublication();const bytes=JSON.stringify(p);assert.equal((await verifyPublication(p,{now:'2026-09-08T12:00:00.000Z'})).freshness.status,'within_two_day_window');assert.equal((await verifyPublication(p,{now:'2026-10-10T12:00:00.000Z'})).freshness.status,'stale');assert.equal(JSON.stringify(p),bytes)});
test('missing report is retained as partial coverage without invented zeros',async()=>{const p=await syntheticPublication();p.observations=[];p.coverage.missing=['2026-09-07'];p.coverage.status='partial';p.publicationId=await publicationId(p);assert.equal((await verifyPublication(p)).status,'VERIFIED_PUBLIC_PROJECTION')});
test('withheld differs from a source null',async()=>{const p=await syntheticPublication();Object.assign(p.observations[0].metrics[0],{value:null,valueType:'withheld',status:'withheld',publicationStatus:'withheld',withholdingReason:'family_suppressed'});p.publicationId=await publicationId(p);assert.equal((await verifyPublication(p)).status,'VERIFIED_PUBLIC_PROJECTION')});
test('order and wall clock do not enter identity',async()=>{const a=await syntheticPublication();const b=Object.fromEntries(Object.entries(a).toReversed());assert.equal(await publicationId(a),await publicationId(b))});
test('duplicate JSON keys and floating count lexemes are rejected',async()=>{const p=await syntheticPublication();await assert.rejects(verifyPublication(JSON.stringify(p).replace('"fixtureOnly":true','"fixtureOnly":true,"fixtureOnly":false')),/duplicate_key/);await assert.rejects(verifyPublication(JSON.stringify(p).replace('"value":0','"value":0.0')),/non_integer_lexeme/)});

for(const state of ['measured','measured_zero','partial','not_measurable','observation_unavailable','not_applicable'])test('preserve report state: '+state,async()=>{const p=await syntheticPublication(),r=p.observations[0],m=r.metrics[0];r.reportStatus=state;r.reasonCode=['partial','not_measurable','observation_unavailable'].includes(state)?'source_unavailable':null;if(state==='measured')Object.assign(m,{value:7,status:'measured'});if(['not_measurable','observation_unavailable','not_applicable'].includes(state))Object.assign(m,{value:null,valueType:'null',status:state==='not_applicable'?'not_applicable':'not_measurable'});p.publicationId=await publicationId(p);assert.equal((await verifyPublication(p)).status,'VERIFIED_PUBLIC_PROJECTION')});
test('unavailable report cannot carry a measured value',async()=>{const p=await syntheticPublication();p.observations[0].reportStatus='observation_unavailable';p.publicationId=await publicationId(p);await assert.rejects(verifyPublication(p),/REPORT_METRIC_CONTRADICTION/)});
test('synthetic category cannot be relabelled as operational proof',async()=>{const p=await syntheticPublication();p.category='operational_measurement';p.publicationId=await publicationId(p);await assert.rejects(verifyPublication(p),/PUBLIC_CATEGORY/)});


test('withheld metric status cannot disclose zero and report-level zero forbids suppression',async()=>{
 const p=await syntheticPublication(),r=p.observations[0],m=r.metrics[0];
 Object.assign(m,{value:null,valueType:'withheld',publicationStatus:'withheld',withholdingReason:'family_suppressed'});
 p.publicationId=await publicationId(p);await assert.rejects(verifyPublication(p),/WITHHOLDING_STATUS/);
 m.status='withheld';p.publicationId=await publicationId(p);await verifyPublication(p);
 r.reportStatus='measured_zero';p.publicationId=await publicationId(p);await assert.rejects(verifyPublication(p),/WITHHOLDING_REPORT_DISCLOSES_ZERO/);
});
