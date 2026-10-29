// SPDX-License-Identifier: Apache-2.0
import {create} from 'jsondiffpatch';
import {isDeepStrictEqual} from 'node:util';
import {isAdmitted,assertComplexity,LIMITS} from './comparison-admission.mjs';
export const PROFILE='gcr-exact-occurrences-1';
export const RENDERER='gcr-comparison-cards-1';
export const escapePointer=key=>String(key).replaceAll('~','~0').replaceAll('/','~1');
const child=(path,key)=>path+'/'+escapePointer(key);
const clone=value=>structuredClone(value);
const keys={causalContexts:'id',applicabilityChains:'id',weightingRules:'ruleId',answerBoundaries:'ruleId',includedUnits:'unitId',includedArtifacts:'path',units:'unit.unitId',sources:'sourcePath'};
const readKey=(object,key)=>key.split('.').reduce((v,k)=>v?.[k],object);
function matchingMaps(a,b){
 const map=new WeakMap();
 function visit(value,path=''){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){
   const key=keys[path.split('/').at(-1)];
   if(key){
    const seen=new Set();
    for(const object of value){
     // includedArtifacts in manifests is a list of strings, not object identities.
     if(typeof object==='string'&&path.startsWith('/manifest/'))continue;
     const id=readKey(object,key);
     if(typeof id!=='string'||!id||seen.has(id))throw Error('matching_key_missing_or_duplicate:'+path);
     seen.add(id);map.set(object,path+':'+key+':'+id);
    }
   }else {
    // Unspecified selected-value collections match exact complete values only, never persistent identities.
    const stable=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
    for(const object of value)if(object&&typeof object==='object')map.set(object,path+':exact-complete-value:'+JSON.stringify(stable(object)));
   }
  }
  for(const [key,valueChild] of Object.entries(value))visit(valueChild,child(path,key));
 }
 visit(a);visit(b);return map;
}
export function rawDifference(a,b){
 assertComplexity(a);assertComplexity(b);
 const identities=matchingMaps(a,b);
 const engine=create({textDiff:{minLength:Infinity},cloneDiffValues:true,arrays:{detectMove:true,includeValueOnMove:true},
  objectHash:object=>identities.get(object)});
 return engine.diff(a,b);
}
function rawBranches(delta,path='',result=[]){
 if(delta===undefined)return result;
 if(Array.isArray(delta)){result.push(path);return result;}
 if(!delta||typeof delta!=='object')throw Error('unknown_delta_shape:'+path);
 for(const [key,value] of Object.entries(delta)){
  if(key==='_t'&&typeof value==='string'){if(value!=='a')throw Error('unknown_delta_marker');result.push(child(path,key));}
  else rawBranches(value,child(path,key),result);
 }
 return result;
}
function category(path){
 for(const key of ['activationConditions','nonApplicabilityConditions','requiredEvidence','forbiddenInferences','applicabilityAbuseBoundaries'])if(path.split('/').includes(key))return key;
 if(path.startsWith('/sources'))return 'sources';
 if(path.startsWith('/units')||path.includes('/includedUnits'))return 'units';
 if(path.includes('/causalContexts'))return 'causalContexts';
 if(/\/(weightingRules|answerBoundaries)\//.test(path))return 'rules';
 if(/(Url|Path|Digest|digest|canonicalization|includedArtifacts)/.test(path))return 'references';
 return 'metadata';
}
export function normalizeDelta(delta,a,b){
 const expected=rawBranches(delta),consumed=[],operations=[];
 const consume=path=>consumed.push(path);
 const emit=(kind,pathA,pathB,before,after,rawPath,matching='exact-value',ambiguous=false)=>{
  const op={id:'op-'+String(operations.length+1).padStart(5,'0'),kind,pathA,pathB,category:category(pathB??pathA??''),matching,ambiguous,rawBranches:[rawPath]};
  if(pathA!==null)op.before=clone(before);if(pathB!==null)op.after=clone(after);
  operations.push(op);consume(rawPath);
 };
 function walk(d,left,right,pa,pb,dp){
  if(d===undefined)return;
  if(Array.isArray(d)){
   if(d.length===1&&left===undefined)emit('add',null,pb,undefined,right,dp);
   else if(d.length===2)emit('replace',pa,pb,left,right,dp,'field-in-matched-context');
   else if(d.length===3&&d[1]===0&&d[2]===0)emit('remove',pa,null,left,undefined,dp);
   else throw Error('unsupported_delta_operation:'+dp);
   return;
  }
  if(!d||typeof d!=='object')throw Error('unknown_delta_shape:'+dp);
  if(d._t==='a'){
   if(d._t!=='a'||!Array.isArray(left)||!Array.isArray(right))throw Error('invalid_array_delta');
   consume(child(dp,'_t'));
   const removed=new Map(),inserted=new Map(),remaining=[];
   const ambiguous=new Set(left.map(v=>JSON.stringify(v))).size!==left.length||new Set(right.map(v=>JSON.stringify(v))).size!==right.length;
   for(const [key,value] of Object.entries(d)){
    if(key==='_t')continue;
    if(/^_\d+$/.test(key)){
     const index=Number(key.slice(1));if(index>=left.length||!Array.isArray(value)||value.length!==3||![0,3].includes(value[2]))throw Error('invalid_array_removal');
     removed.set(index,true);
     if(value[2]===3){
      const to=value[1];if(!Number.isInteger(to)||to<0||to>=right.length||inserted.has(to))throw Error('invalid_array_move');
      inserted.set(to,index);
      emit('order',child(pa,index),child(pb,to),left[index],right[to],child(dp,key),'calculated-alignment-not-editorial-history',ambiguous);
     }else{if(value[1]!==0)throw Error('invalid_array_removal');emit('remove',child(pa,index),null,left[index],undefined,child(dp,key),'exact-occurrence',ambiguous);}
    }else if(/^(0|[1-9]\d*)$/.test(key)){
     const index=Number(key);if(index>=right.length)throw Error('invalid_array_index');
     if(Array.isArray(value)&&value.length===1){if(inserted.has(index))throw Error('conflicting_array_delta');inserted.set(index,null);}
    }else throw Error('unknown_array_branch:'+key);
   }
   for(let i=0;i<left.length;i++)if(!removed.has(i))remaining.push(i);
   const mapping=[];let next=0;
   for(let j=0;j<right.length;j++)mapping[j]=inserted.has(j)?inserted.get(j):remaining[next++];
   if(next!==remaining.length)throw Error('uncovered_array_alignment');
   for(const [key,value] of Object.entries(d)){
    if(!/^(0|[1-9]\d*)$/.test(key))continue;
    const index=Number(key),old=mapping[index];
    walk(value,old===null?undefined:left[old],right[index],old===null?null:child(pa,old),child(pb,index),child(dp,key));
   }
  }else{
   if(!left||!right||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)||Array.isArray(right))throw Error('invalid_object_delta');
   for(const [key,value] of Object.entries(d))walk(value,left[key],right[key],child(pa,key),child(pb,key),child(dp,key));
  }
 }
 walk(delta,a,b,'','','');
 if(new Set(consumed).size!==consumed.length||!isDeepStrictEqual([...expected].sort(),[...consumed].sort()))throw Error('raw_delta_coverage_failed');
 return {operations,rawCoverage:{branches:expected,consumed,complete:true,recognizedMetadata:'_t=a only'}};
}
const boundaryFields=['activationConditions','nonApplicabilityConditions','requiredEvidence','forbiddenInferences','applicabilityAbuseBoundaries'];
function coherence(entry){
 const p=entry.scope.pack;
 if(!entry.identity.fictional||p.compositionPolicyId!=='fictional-boreal-local-explanation-v1')return {status:'not-defined',relations:[]};
 const relations=boundaryFields.map(field=>({rootPath:'/pack/'+field,chainPaths:p.applicabilityChains.map((_,i)=>'/pack/applicabilityChains/'+i+'/'+field),
  root:p[field],chains:p.applicabilityChains.map(c=>c[field]),matches:isDeepStrictEqual(p[field],p.applicabilityChains.flatMap(c=>c[field]))}));
 return {status:relations.every(r=>r.matches)?'satisfied':'divergence',provenance:'fixed Boreal generator: root lists projected from authored chains; no causal-list equivalence',relations};
}
export function compareAdmitted(a,b){
 if(!isAdmitted(a)||!isAdmitted(b))throw Error('admitted_entries_required');
 for(const field of ['packId','intentToken','lang'])if(a.identity.selection[field]!==b.identity.selection[field])throw Error('incompatible_'+field);
 if(!isDeepStrictEqual(a.identity.schema,b.identity.schema)||!isDeepStrictEqual(a.identity.manifestSchema,b.identity.manifestSchema))throw Error('incompatible_schema_profile');
 const delta=rawDifference(a.scope,b.scope),normalized=normalizeDelta(delta,a.scope,b.scope);
 const groups=[...new Set(normalized.operations.map(op=>op.category))].map(category=>({category,operationIds:normalized.operations.filter(op=>op.category===category).map(op=>op.id)}));
 const ids=groups.flatMap(g=>g.operationIds);if(ids.length!==normalized.operations.length||new Set(ids).size!==ids.length)throw Error('report_coverage_failed');
 if(normalized.operations.length>LIMITS.operations)throw Error('comparison_operation_limit');
 const report={schemaVersion:'gcr-comparison-report-1',direction:'B-relative-to-A',status:'complete',profile:PROFILE,renderer:RENDERER,
  matchingPolicies:{namedCollections:'unique scoped keys',otherObjectCollections:'exact complete values only; rewritten objects are removed and added'},
  engine:{name:'jsondiffpatch',version:'0.7.6',strings:'atomic',cloneDiffValues:true,appliesPatches:false},
  A:clone(a.identity),B:clone(b.identity),scope:['pack','manifest','selected-units','archived-source-bytes'],exclusions:[],
  equality:{packBytes:a.originals.packBase64===b.originals.packBase64,packStructure:isDeepStrictEqual(a.scope.pack,b.scope.pack)},
  operations:normalized.operations,rawCoverage:normalized.rawCoverage,groups,presentationCoverage:{complete:true,operationIds:ids,countUnit:'normalized operations, not distinct normative rules'},
  coherence:{A:coherence(a),B:coherence(b)},originals:{A:clone(a.originals),B:clone(b.originals)},context:{A:clone(a.scope),B:clone(b.scope)},
  errors:[],ambiguities:normalized.operations.filter(op=>op.ambiguous).map(op=>op.id),editorialRelations:[],
  limits:['No publication succession inferred','Integrity is not truth, permission or model fidelity','No automatic semantic interpretation','Host metadata is not secret']};
 if(Buffer.byteLength(JSON.stringify(report))>LIMITS.reportBytes)throw Error('comparison_report_size_limit');
 return report;
}
