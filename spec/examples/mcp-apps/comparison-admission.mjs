// SPDX-License-Identifier: Apache-2.0
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Ajv2020} from 'ajv/dist/2020.js';
import './data.mjs';
const {inspectVerifiedPack}=await import('./reference/spec/examples/verified-pack.mjs');
const {strictParse}=await import('./reference/spec/reference/verification.mjs');
export const LIMITS=Object.freeze({snapshotBytes:8*1024*1024,archiveBytes:8*1024*1024,totalArchiveBytes:64*1024*1024,packBytes:1024*1024,nodes:50000,arrayLength:1000,depth:48,reportBytes:8*1024*1024,operations:5000});
export const sha=bytes=>'sha-256:'+createHash('sha256').update(bytes).digest('hex');
export function assertComplexity(value,limits=LIMITS){
 let nodes=0;const pending=[[value,0]];
 while(pending.length){const [v,depth]=pending.pop();if(++nodes>limits.nodes||depth>limits.depth)throw Error('comparison_complexity_limit');
  if(v&&typeof v==='object'){if(Array.isArray(v)&&v.length>limits.arrayLength)throw Error('comparison_array_limit');for(const child of Object.values(v))pending.push([child,depth+1]);}}
}
const validators={},schemas={};
const ajv=new Ajv2020({strict:true,strictRequired:false,allErrors:true,validateFormats:false});
for(const name of ['context-pack.schema.json','context-pack-manifest.schema.json']){
 const raw=await readFile(new URL('./reference/spec/'+name,import.meta.url));
 const schema=strictParse(raw);schemas[name]={id:schema.$id,digest:sha(raw),profile:'draft-2020-12-ajv-8.20.0-formats-not-asserted'};
 validators[name]=ajv.compile(schema);
}
export function validateDocument(name,value){
 if(!validators[name])throw Error('unsupported_schema');
 assertComplexity(value);
 if(!validators[name](value))throw Error('schema_nonconformant:'+name+':declared-version='+JSON.stringify(value?.schemaVersion)+':'+JSON.stringify(validators[name].errors));
 return structuredClone(schemas[name]);
}
const admitted=new WeakSet();
export function isAdmitted(value){return admitted.has(value);}
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
export async function admitComparison({snapshotBytes,getArchive,expectedRoot,rootProvenance,intentToken,lang,version,expectedIntents,fictional=false}){
 if(typeof rootProvenance!=='string'||!rootProvenance.trim())throw Error('separate_root_provenance_required');
 const rawSnapshot=Buffer.from(snapshotBytes);
 if(rawSnapshot.length>LIMITS.snapshotBytes)throw Error('snapshot_size_limit');
 const snapshot=strictParse(rawSnapshot);assertComplexity(snapshot);
 const archives=new Map();let total=0;
 const view=await inspectVerifiedPack({snapshotBytes:rawSnapshot,expectedRoot,intentToken,lang,version,expectedIntents,
  getArchive:async uri=>{const raw=Buffer.from(await getArchive(uri));total+=raw.length;if(raw.length>LIMITS.archiveBytes||total>LIMITS.totalArchiveBytes)throw Error('archive_size_limit');archives.set(uri,raw);return raw;}});
 const entry=snapshot.inventory.packs.find(p=>p.intentToken===intentToken&&p.lang===lang&&p.version===version);
 const original=path=>{const item=snapshot.inventory.items.find(i=>i.sourcePath===path);if(!item||!archives.has(item.uri))throw Error('required_archive_missing');return Buffer.from(strictParse(archives.get(item.uri)).contentBase64,'base64');};
 const packBytes=original(entry.payloadSourcePath),manifestBytes=original(entry.manifestSourcePath);
 if(packBytes.length>LIMITS.packBytes)throw Error('pack_size_limit');
 // Parse the very bytes cited by occurrences; no caller-owned parsed object is trusted.
 const pack=strictParse(packBytes,{historical:true}),manifest=strictParse(manifestBytes,{historical:true});
 const packSchema=validateDocument('context-pack.schema.json',pack),manifestSchema=validateDocument('context-pack-manifest.schema.json',manifest);
 const scope={pack,manifest,units:structuredClone(view.units),sources:structuredClone(view.sources)};
 assertComplexity(scope);
 const result=freeze({identity:{fictional,selection:view.verification.selection,root:expectedRoot,rootProvenance,snapshotDigest:sha(rawSnapshot),
  packBytesDigest:sha(packBytes),packBytesLength:packBytes.length,payloadDigest:entry.payloadDigest,payloadDigestScope:entry.payloadDigestScope,
  packBytesScope:'repository-bytes',canonicalizationPolicyId:manifest.canonicalizationPolicyId,payloadFileDigest:manifest.payloadFileDigest,payloadFileDigestScope:manifest.payloadFileDigestScope,packPath:entry.payloadSourcePath,manifestPath:entry.manifestSourcePath,
  manifestBytesDigest:sha(manifestBytes),schema:packSchema,manifestSchema,integrity:view.verification,schemaConformance:'validated'},
  originals:{packBase64:packBytes.toString('base64'),manifestBase64:manifestBytes.toString('base64')},scope});
 admitted.add(result);return result;
}
