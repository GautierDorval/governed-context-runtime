// SPDX-License-Identifier: Apache-2.0
// The Web publication accepts only build-admitted catalog pairs. No user documents.
export function createReportLoader(manifest,{fetchImpl=globalThis.fetch,baseUrl=import.meta.url,timeoutMs=15000}={}){
 const entries=new Map(manifest.catalog.map(entry=>[entry.id,entry]));
 const base=new URL(baseUrl);
 return async function load(A,B,{signal}={}){
  if(!entries.has(A)||!entries.has(B)||entries.get(A).lang!==entries.get(B).lang)throw Error('comparison_pair_not_published');
  const record=manifest.reports.find(r=>r.A===A&&r.B===B);
  if(!record||!/^reports\/[a-f0-9]{64}\.json$/.test(record.path)||!Number.isSafeInteger(record.bytes)||record.bytes<1||record.bytes>8*1024*1024)throw Error('comparison_report_not_published');
  const url=new URL(record.path,base);if(url.origin!==base.origin)throw Error('comparison_origin_refused');
  const controller=new AbortController(),cancel=()=>controller.abort();
  if(signal?.aborted)throw Error('comparison_cancelled');
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,timeoutMs);let reader;
  try{
   const response=await fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',signal:controller.signal});
   if(response.status!==200||!response.headers.get('content-type')?.split(';')[0].trim().endsWith('/json'))throw Error('comparison_response_refused');
   if(!response.headers.has('content-encoding')&&response.headers.has('content-length')&&Number(response.headers.get('content-length'))!==record.bytes)throw Error('comparison_size_mismatch');
   if(!response.body)throw Error('comparison_body_missing');
   reader=response.body.getReader();const chunks=[];let total=0;
   while(true){if(controller.signal.aborted)throw Error('comparison_cancelled');const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>record.bytes)throw Error('comparison_size_mismatch');chunks.push(value);}
   if(total!==record.bytes)throw Error('comparison_size_mismatch');
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(digest!==record.sha256||record.path!=='reports/'+digest+'.json')throw Error('comparison_digest_mismatch');
   if(controller.signal.aborted)throw Error('comparison_cancelled');
   const report=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   return {_meta:{gcr:{comparison:report}}};
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);await reader?.cancel().catch(()=>{});reader?.releaseLock();}
 };
}
