// SPDX-License-Identifier: Apache-2.0
// Public verifier: only the projected bytes are verified, not the private Data archive.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonical,digest,strictParse} from '../reference/verification.mjs';
export const SCHEMA='runtime-public-evidence/0.1.0-proposed';
export const VERSION='public-projection/0.1.0-proposed';
export const STATES=['measured','measured_zero','partial','not_measurable','observation_unavailable','not_applicable'];
export const fail=code=>{const error=new Error(code);error.code=code;throw error};
export const requireThat=(condition,code)=>{if(!condition)fail(code)};
export const exact=(o,names)=>o && typeof o==='object' && !Array.isArray(o) && Object.keys(o).sort().join(',')===names.split(',').filter(Boolean).sort().join(',');
const equal=(a,b)=>Buffer.from(canonical(a)).equals(Buffer.from(canonical(b)));
export const hashPattern=/^sha-256:[a-f0-9]{64}$/;
export function date(value){return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value}
export function timestamp(value){return typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value}
export const nextDate=value=>new Date(Date.parse(value)+86400000).toISOString().slice(0,10);
export function validateContent(p){
 requireThat(exact(p,'schema,projectionVersion,documentVersion,corpusRootDigest,category,fixtureOnly,policyDigest,coverage,observations,limitations,publicationId'),'PUBLIC_FIELDS');
 requireThat(p.schema===SCHEMA && p.projectionVersion===VERSION && p.documentVersion==='0.1.0-proposed','PUBLIC_VERSION');
 requireThat(p.category==='synthetic_pipeline_fixture' && p.fixtureOnly===true,'PUBLIC_CATEGORY');
 requireThat(hashPattern.test(p.corpusRootDigest) && hashPattern.test(p.policyDigest) && hashPattern.test(p.publicationId),'PUBLIC_IDENTITIES');
 requireThat(exact(p.coverage,'start,endExclusive,expectedSources,status,missing') && date(p.coverage.start) && date(p.coverage.endExclusive) && p.coverage.start<p.coverage.endExclusive,'COVERAGE_WINDOW');
 requireThat(equal(p.coverage.expectedSources,['runtime-ledger']) && ['complete','partial'].includes(p.coverage.status) && Array.isArray(p.coverage.missing),'COVERAGE_PROFILE');
 requireThat(Array.isArray(p.observations) && p.observations.length<=366,'OBSERVATIONS');
 const seen=new Set(),expected=[];
 for(let d=p.coverage.start;d<p.coverage.endExclusive;d=nextDate(d)){requireThat(expected.length<366,'COVERAGE_TOO_LARGE');expected.push(d)}
 let previous='';
 for(const row of p.observations){
  requireThat(exact(row,'date,source,population,reportStatus,reasonCode,capturedAt,archivedAt,measurementEpoch,metrics,qualifications'),'ROW_FIELDS');
  requireThat(date(row.date) && expected.includes(row.date) && row.date>previous,'ROW_DATE_ORDER');previous=row.date;seen.add(row.date);
  requireThat(row.source==='runtime-ledger' && row.population==='synthetic-fixture-only','POPULATION');
  requireThat(STATES.includes(row.reportStatus),'REPORT_STATUS');
  requireThat(row.reasonCode===null || row.reasonCode==='source_unavailable','REASON_CODE');
  if(['partial','not_measurable','observation_unavailable'].includes(row.reportStatus))requireThat(row.reasonCode!==null,'REASON_REQUIRED');
  requireThat(timestamp(row.capturedAt) && timestamp(row.archivedAt) && row.capturedAt<=row.archivedAt,'OBSERVATION_TIMESTAMPS');
  // No active deployment inference from a historical source receipt.
  requireThat(row.measurementEpoch==='not_established','MEASUREMENT_EPOCH');
  requireThat(equal(row.qualifications,['fixture_not_live','not_external_adoption','no_aggregate_completeness_claim']),'QUALIFICATIONS');
  requireThat(Array.isArray(row.metrics) && row.metrics.length===1,'METRIC_PROFILE');
  const m=row.metrics[0];
  requireThat(exact(m,'id,value,valueType,unit,status,publicationStatus,withholdingReason,formula,denominator'),'METRIC_FIELDS');
  requireThat(m.id==='activity/observed' && m.unit==='count' && m.formula==='source_value_no_aggregation' && m.denominator===null,'METRIC_DEFINITION');
  requireThat(['measured','measured_zero','not_measurable','not_applicable','withheld'].includes(m.status),'METRIC_STATUS');
  requireThat(['published','withheld'].includes(m.publicationStatus),'PUBLICATION_STATUS');
  if(m.publicationStatus==='published' && row.reportStatus==='measured_zero')requireThat(m.status==='measured_zero','REPORT_METRIC_CONTRADICTION');
  if(m.publicationStatus==='published' && ['not_measurable','observation_unavailable'].includes(row.reportStatus))requireThat(m.status==='not_measurable','REPORT_METRIC_CONTRADICTION');
  if(m.publicationStatus==='published' && row.reportStatus==='not_applicable')requireThat(m.status==='not_applicable','REPORT_METRIC_CONTRADICTION');
  if(m.publicationStatus==='withheld'){
   requireThat(row.reportStatus!=='measured_zero','WITHHOLDING_REPORT_DISCLOSES_ZERO');
   requireThat(m.status==='withheld','WITHHOLDING_STATUS');
   requireThat(m.value===null && m.valueType==='withheld' && m.withholdingReason==='family_suppressed','WITHHOLDING');
  }else{
   requireThat(m.withholdingReason===null && m.status!=='withheld','WITHHOLDING');
   if(['not_measurable','not_applicable'].includes(m.status))requireThat(m.value===null && m.valueType==='null','NULL_NOT_ZERO');
   else requireThat(Number.isSafeInteger(m.value) && m.value>=0 && m.valueType==='number' && (m.status==='measured_zero' ? m.value===0 : m.value>0),'COUNT_VALUE');
  }
 }
 const missing=expected.filter(d=>!seen.has(d));
 requireThat(equal(p.coverage.missing,missing) && p.coverage.status===(missing.length?'partial':'complete'),'COVERAGE_FALSE_COMPLETE');
 requireThat(equal(p.limitations,['Synthetic fixture; no production observations.','Projection verification does not authenticate private source completeness.','One archive has multiple projections, not independent confirmations.','No automatic inference of external adoption or model compliance.']),'LIMITATIONS');
 return p;
}
export async function publicationId(content){const {publicationId:ignored,...preimage}=content;return digest(canonical(preimage))}
export async function verifyPublication(input,{now}={}){
 const p=validateContent(typeof input==='string'||input instanceof Uint8Array?strictParse(input):input);
 requireThat(await publicationId(p)===p.publicationId,'PUBLIC_DIGEST');
 let freshness={status:'not_evaluated'};
 if(now!==undefined){requireThat(timestamp(now),'VERIFICATION_TIME');const age=Date.parse(now)-Date.parse(p.coverage.endExclusive+'T00:00:00.000Z');freshness={status:age<0?'future_window':age>172800000?'stale':'within_two_day_window',checkedAt:now,ageSeconds:Math.floor(age/1000),limitation:'Fixture clock comparison, not a service freshness guarantee.'}}
 return {status:'VERIFIED_PUBLIC_PROJECTION',publicationId:p.publicationId,sourceAuthenticated:false,live:false,freshness};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try {console.log(JSON.stringify(await verifyPublication(await readFile(process.argv[2]),{now:process.argv[3]}),null,2))}
 catch(e){console.error(JSON.stringify({status:'REJECTED',reason:e.code||'INVALID_INPUT'}));process.exitCode=2}
}
