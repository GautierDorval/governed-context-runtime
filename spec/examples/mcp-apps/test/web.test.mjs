// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createReportLoader} from '../web-transport.mjs';
const bytes=new TextEncoder().encode(JSON.stringify({status:'complete',value:'é'}));
const sha256=createHash('sha256').update(bytes).digest('hex');
const manifest={catalog:[{id:'A',lang:'fr'},{id:'B',lang:'fr'},{id:'C',lang:'en'}],reports:[{A:'A',B:'B',path:'reports/'+sha256+'.json',sha256,bytes:bytes.length}]};
const response=(body=bytes,headers={})=>new Response(body,{status:200,headers:{'content-type':'application/json',...headers}});
const loader=(fetchImpl,m=manifest)=>createReportLoader(m,{fetchImpl,baseUrl:'https://example.invalid/assets/../'});
test('published pair: exact bytes checked and requests cannot carry credentials or follow redirects',async()=>{
 let call;const result=await loader(async(url,options)=>{call={url,options};return response();})('A','B');
 assert.equal(result._meta.gcr.comparison.value,'é');assert.equal(call.url.origin,'https://example.invalid');assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');assert.equal(call.options.method,'GET');
});
test('unknown and cross-language pairs fail before a request',async()=>{
 const load=loader(()=>{throw Error('unexpected_network');});await assert.rejects(load('X','B'),/pair_not_published/);await assert.rejects(load('A','C'),/pair_not_published/);
});
test('wrong status, MIME, truncated and oversized data fail closed',async()=>{
 for(const r of [new Response('',{status:404}),new Response(bytes,{headers:{'content-type':'text/html'}}),response(bytes.slice(1)),response(new Uint8Array(bytes.length+1)),response(bytes,{'content-length':String(bytes.length-1)})])await assert.rejects(loader(async()=>r)('A','B'),/response_refused|size_mismatch/);
});
test('a same-length altered report cannot be displayed',async()=>{
 const altered=bytes.slice();altered[altered.length-2]=32;await assert.rejects(loader(async()=>response(altered))('A','B'),/digest_mismatch/);
});
test('decoded response length is checked independently of compressed Content-Length',async()=>{
 const r=await loader(async()=>response(bytes,{'content-encoding':'br','content-length':'5'}))('A','B');assert.equal(r._meta.gcr.comparison.status,'complete');
});
test('manifest cannot introduce a remote URL or an oversized report',async()=>{
 for(const patch of [{path:'https://outside.invalid/report.json'},{bytes:8*1024*1024+1}]){
  const m=structuredClone(manifest);Object.assign(m.reports[0],patch);await assert.rejects(loader(()=>{throw Error('unexpected_network');},m)('A','B'),/report_not_published/);
 }
});
test('cancelled selection and transport timeout never produce a report',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(loader(()=>{throw Error('unexpected_network');})('A','B',{signal:controller.signal}),/cancelled/);
 const load=createReportLoader(manifest,{baseUrl:'https://example.invalid/',timeoutMs:15,fetchImpl:(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('request_aborted')),{once:true}))});
 await assert.rejects(load('A','B'),/request_aborted/);
});

const withBytes=data=>{
 const m=structuredClone(manifest),hash=createHash('sha256').update(data).digest('hex');
 Object.assign(m.reports[0],{sha256:hash,path:'reports/'+hash+'.json',bytes:data.length});return m;
};
test('only exact 200 and application/json are accepted; media type casing is ignored',async()=>{
 for(const r of [new Response(bytes,{status:206,headers:{'content-type':'application/json'}}),response(bytes,{'content-type':'text/json'}),response(bytes,{'content-type':'application/problem+json'})])await assert.rejects(loader(async()=>r)('A','B'),/response_refused/);
 assert.equal((await loader(async()=>response(bytes,{'content-type':'Application/JSON; charset=UTF-8'}))('A','B'))._meta.gcr.comparison.value,'é');
});
test('a never-ending response is stopped as soon as its byte bound is exceeded',async()=>{
 let reads=0,cancelled=false;
 const stream=new ReadableStream({pull(controller){
  reads++;if(reads>3){controller.error(Error('unbounded_stream_was_read'));return;}
  controller.enqueue(new Uint8Array(bytes.length+1));
 },cancel(){cancelled=true;}});
 await assert.rejects(loader(async()=>response(stream))('A','B'),/size_mismatch/);
 assert.ok(reads<=3);assert.equal(cancelled,true);
});
test('invalid UTF-8 is rejected even when size and SHA-256 are valid',async()=>{
 const invalid=Uint8Array.from([123,34,118,34,58,34,0xc0,34,125]);
 await assert.rejects(loader(async()=>response(invalid),withBytes(invalid))('A','B'),TypeError);
});
test('caller cancellation is forwarded to an already pending network request',async()=>{
 const caller=new AbortController();let networkSignal;
 const load=createReportLoader(manifest,{baseUrl:'https://example.invalid/',timeoutMs:40,fetchImpl:(_,{signal})=>{
  networkSignal=signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('network_aborted')),{once:true}));
 }});
 const settled=load('A','B',{signal:caller.signal}).then(()=>({ok:true}),error=>({error}));
 caller.abort();const forwarded=networkSignal.aborted;const result=await settled;
 assert.equal(forwarded,true);assert.match(result.error?.message??'',/network_aborted/);
});
test('an abort immediately after headers cannot return a valid report',async()=>{
 const caller=new AbortController();
 await assert.rejects(loader(async()=>{caller.abort();return response();})('A','B',{signal:caller.signal}),/cancelled/);
});
test('the content-addressed filename must match the actual digest',async()=>{
 const m=structuredClone(manifest);m.reports[0].path='reports/'+'0'.repeat(64)+'.json';
 await assert.rejects(loader(async()=>response(),m)('A','B'),/digest_mismatch/);
});
test('early status, MIME and Content-Length refusals cancel unread bodies',async()=>{
 for(const config of [{status:206,headers:{'content-type':'application/json'}},{headers:{'content-type':'text/plain'}},{headers:{'content-type':'application/json','content-length':String(bytes.length+1)}}]){
  let cancelled=false;
  const r=new Response(new ReadableStream({cancel(){cancelled=true;}}),config);
  await assert.rejects(loader(async()=>r)('A','B'),/response_refused|size_mismatch/);
  assert.equal(cancelled,true);
 }
});
test('qualification flags precede or follow an output path and public assets are digest-bound',async t=>{
 const parent=await mkdtemp(join(tmpdir(),'gcr-web-build-options-'));
 t.after(()=>rm(parent,{recursive:true,force:true}));
 const buildScript=fileURLToPath(new URL('../web-build.mjs',import.meta.url));
 const run=promisify(execFile);
 for(const flagFirst of [true,false]){
  const out=join(parent,flagFirst?'flag-first':'flag-last');
  const args=flagFirst?['--qualification',out]:[out,'--qualification'];
  await run(process.execPath,[buildScript,...args],{timeout:30000,maxBuffer:1024*1024});
  const version=JSON.parse(await readFile(join(out,'version.json'),'utf8'));
  assert.equal(version.qualificationOnly,true);assert.equal(version.reportCount,8);
  assert.equal(Object.keys(version.assetSha256).length,15);
  for(const path of ['assets/app.js','assets/style.css','catalog.json','third-party-notices.txt','index.html','fr/index.html','en/index.html'])assert.equal(version.assetSha256[path],createHash('sha256').update(await readFile(join(out,path))).digest('hex'));
  for(const [path,sha] of Object.entries(version.assetSha256))assert.equal(sha,createHash('sha256').update(await readFile(join(out,path))).digest('hex'));
 }
 await assert.rejects(run(process.execPath,[buildScript,'--unknown'],{timeout:10000}),/usage: web-build/);
 await assert.rejects(run(process.execPath,[buildScript,'one','two'],{timeout:10000}),/usage: web-build/);
});
