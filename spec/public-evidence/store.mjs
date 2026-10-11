// SPDX-License-Identifier: Apache-2.0
// Local candidate storage only. No Git, network, activation or publication authority.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {canonical,digest,strictParse} from '../reference/verification.mjs';
import {verifyPublication,requireThat,exact,timestamp} from './verify.mjs';
const bytes=value=>Buffer.from(canonical(value));
async function absentRead(file){try{return await fs.readFile(file)}catch(e){if(e.code==='ENOENT')return null;throw e}}
export async function verifyStoredBundle(directory){
 const names=(await fs.readdir(directory)).sort();
 requireThat(JSON.stringify(names)===JSON.stringify(['manifest.json','publication.json']),'BUNDLE_FILES');
 for(const name of names)requireThat((await fs.lstat(path.join(directory,name))).isFile(),'BUNDLE_REGULAR_FILE');
 const body=await fs.readFile(path.join(directory,'publication.json')),m=strictParse(await fs.readFile(path.join(directory,'manifest.json')));
 requireThat(exact(m,'schema,publicationId,sha256,bytes') && m.schema==='public-projection-bundle/0.1.0-proposed','BUNDLE_MANIFEST');
 const result=await verifyPublication(body);
 requireThat(m.publicationId===result.publicationId && m.bytes===body.length && m.sha256===await digest(body),'BUNDLE_INTEGRITY');
 return strictParse(body);
}
export async function storeCandidate(root,input,{checkedAt,failBeforePointer=false}={}){
 // Validate and snapshot before filesystem effects. All names are derived, never caller paths.
 requireThat(timestamp(checkedAt),'VERIFICATION_TIME');
 const p=strictParse(bytes(input));await verifyPublication(p);
 root=path.resolve(root);await fs.mkdir(root,{recursive:true});requireThat((await fs.lstat(root)).isDirectory(),'STORE_DIRECTORY');
 const lease=path.join(root,'.writer-lock');
 let handle;try{handle=await fs.open(lease,'wx')}catch(e){if(e.code==='EEXIST')return {status:'NOT_STORED',reason:'WRITER_BUSY'};throw e}
 const pointer=path.join(root,'current.json');let result;
 try{
  const oldBytes=await absentRead(pointer);let old=null;
  if(oldBytes){const ref=strictParse(oldBytes);requireThat(exact(ref,'schema,publicationId') && ref.schema==='public-projection-pointer/0.1.0-proposed' && /^sha-256:[a-f0-9]{64}$/.test(ref.publicationId),'POINTER_INVALID');old=await verifyStoredBundle(path.join(root,ref.publicationId.slice(8)));requireThat(old.publicationId===ref.publicationId,'POINTER_BINDING')}
  // Consult every retained immutable edition, including editions no longer current.
  // No complementary totals are published by this single-family profile.
  for(const name of await fs.readdir(root)){
   if(!/^[a-f0-9]{64}$/.test(name))continue;
   const prior=await verifyStoredBundle(path.join(root,name));
   for(const row of p.observations){
    const previous=prior.observations.find(r=>r.source===row.source&&r.population===row.population&&r.date===row.date);
    if(previous)requireThat(previous.metrics[0].publicationStatus===row.metrics[0].publicationStatus,'CROSS_RELEASE_DISCLOSURE');
   }
  }
  const observationsChanged=!old || await digest(canonical({coverage:old.coverage,observations:old.observations}))!==await digest(canonical({coverage:p.coverage,observations:p.observations}));
  if(old?.publicationId===p.publicationId){result={status:'UNCHANGED',publicationId:p.publicationId,observationsChanged:false}}
  else{
   const stage=await fs.mkdtemp(path.join(root,'.stage-'));const body=bytes(p);
   await fs.writeFile(path.join(stage,'publication.json'),body,{flag:'wx'});
   await fs.writeFile(path.join(stage,'manifest.json'),bytes({schema:'public-projection-bundle/0.1.0-proposed',publicationId:p.publicationId,sha256:await digest(body),bytes:body.length}),{flag:'wx'});
   await verifyStoredBundle(stage);
   const destination=path.join(root,p.publicationId.slice(8));
   try{await fs.rename(stage,destination)}catch(e){if(!['EEXIST','ENOTEMPTY','EPERM'].includes(e.code))throw e;const existing=await verifyStoredBundle(destination);requireThat(Buffer.from(canonical(existing)).equals(bytes(p)),'IMMUTABLE_CONFLICT')}
   if(failBeforePointer)throw Object.assign(new Error('injected failure'),{code:'INJECTED_FAILURE'});
   const temp=path.join(root,'.pointer-'+randomUUID()+'.json');
   await fs.writeFile(temp,bytes({schema:'public-projection-pointer/0.1.0-proposed',publicationId:p.publicationId}),{flag:'wx'});
   await fs.rename(temp,pointer);
   result={status:'STORED_LOCAL_CANDIDATE',publicationId:p.publicationId,observationsChanged};
  }
 }catch(e){result={status:'NOT_STORED',reason:['INJECTED_FAILURE','IMMUTABLE_CONFLICT','POINTER_INVALID','POINTER_BINDING','BUNDLE_FILES','BUNDLE_MANIFEST','BUNDLE_INTEGRITY','BUNDLE_REGULAR_FILE','CROSS_RELEASE_DISCLOSURE'].includes(e.code)?e.code:'LOCAL_STORAGE_FAILURE'}}
 finally{await handle.close();await fs.unlink(lease)} // Only the lock created by this call.
 // This clock-bearing event never changes the content identity or certifies freshness.
 const event={...result,checkedAt,externalPublication:false};
 await fs.writeFile(path.join(root,'attempt-'+randomUUID()+'.json'),bytes(event),{flag:'wx'});
 return event;
}
