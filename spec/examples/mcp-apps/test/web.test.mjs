// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
