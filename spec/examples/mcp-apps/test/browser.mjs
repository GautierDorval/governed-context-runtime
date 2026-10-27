// SPDX-License-Identifier: Apache-2.0
// Real companion + MCP stdio + official AppBridge; simulated conversational host, NO model.
import assert from 'node:assert/strict';
import {createServer as httpServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
const arg=k=>process.argv[process.argv.indexOf(k)+1];
if(!process.argv.includes('--puppeteer')||!process.argv.includes('--output'))throw Error('Required: --puppeteer <existing module> --output <evidence directory>');
const {default:puppeteer}=await import(pathToFileURL(resolve(arg('--puppeteer'))).href);
const output=resolve(arg('--output'));await mkdir(output,{recursive:true});
const root=fileURLToPath(new URL('..',import.meta.url));
const client=new Client({name:'gcr-browser-local-qualification',version:'0.1.0'},{capabilities:{}});
await client.connect(new StdioClientTransport({command:process.execPath,args:[resolve(root,'server.mjs')],stderr:'pipe'}));
const hostCode=`
import {AppBridge,PostMessageTransport} from '@modelcontextprotocol/ext-apps/app-bridge';
const frame=document.querySelector('iframe');
window.qualification={contexts:[],messages:[],calls:[],toolResults:[]};
const modes=new URL(location.href).searchParams;
const caps={serverTools:{},message:{text:{}},...(modes.has('unsupported')?{}:{updateModelContext:{text:{}}})};
const bridge=new AppBridge(null,{name:'SIMULATED LOCAL HOST - NO MODEL',version:'0.1.0'},caps);
bridge.oncalltool=async params=>{window.qualification.calls.push(params);const result=await (await fetch('/tool',{method:'POST',body:JSON.stringify(params)})).json();window.qualification.toolResults.push(result);return result;};
bridge.onupdatemodelcontext=async params=>{
 if(modes.has('refuse'))throw Error('Simulated host refusal');
 window.qualification.contexts.push(params);return {};
};
bridge.onmessage=async params=>{window.qualification.messages.push(params);return {};};
bridge.onsizechange=({height})=>frame.style.height=Math.min(height,12000)+'px';
bridge.oninitialized=async()=>{await bridge.sendToolInput({arguments:{}});await bridge.sendToolResult(await (await fetch('/tool',{method:'POST',body:JSON.stringify({name:'open_gcr_selector',arguments:{}})})).json());};
const transport=new PostMessageTransport(frame.contentWindow,frame.contentWindow);
await bridge.connect(transport);
frame.src='/app';
`;
const compiled=await build({stdin:{contents:hostCode,resolveDir:root,sourcefile:'test-host.mjs'},bundle:true,write:false,format:'esm',platform:'browser',absWorkingDir:root,tsconfigRaw:{}});
const html='<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GCR local qualification</title><style>body{margin:0;font:14px system-ui}p{padding:8px;background:#fff1ce;margin:0}iframe{border:0;width:100%;min-height:800px;display:block}</style><p>SIMULATION LOCALE DE L’HÔTE · AUCUN MODÈLE</p><iframe title="GCR local selector" sandbox="allow-scripts allow-same-origin"></iframe><script type="module">'+compiled.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script></html>';
const server=httpServer(async(req,res)=>{
 try{
  if(req.method==='GET'&&req.url.startsWith('/host')){res.setHeader('Content-Type','text/html');res.end(html);}
  else if(req.method==='GET'&&req.url==='/app'){res.setHeader('Content-Type','text/html');res.end(await readFile(resolve(root,'app.html')));}
  else if(req.method==='POST'&&req.url==='/tool'){
   let text='';for await(const b of req){text+=b;if(text.length>10000)throw Error('too_large');}
   const params=JSON.parse(text);if(!['open_gcr_selector','inspect_gcr_pack'].includes(params.name))throw Error('tool_not_admitted');
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await client.callTool(params)));
  }else{res.statusCode=404;res.end();}
 }catch(e){res.statusCode=500;res.end(JSON.stringify({isError:true,error:e.message}));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
let browser;const cases=[];
try{
 browser=await puppeteer.launch({executablePath:process.argv.includes('--browser')?arg('--browser'):'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const width of [390,780]){
  for(const lang of ['fr','en']){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
   await page.setViewport({width,height:844,deviceScaleFactor:1});
   await page.setRequestInterception(true);page.on('request',r=>new URL(r.url()).hostname==='127.0.0.1'?r.continue():r.abort());
   await page.goto('http://127.0.0.1:'+port+'/host');
   await page.waitForFunction(()=>!!document.querySelector('iframe').contentDocument?.querySelector('#inspect:not([disabled])'));
   const frame=page.frames().find(f=>f.url().endsWith('/app'));assert.ok(frame);
   await frame.select('#language',lang);await frame.click('#inspect');
   await frame.waitForFunction(()=>!document.querySelector('#submit').disabled);
   assert.equal((await page.evaluate(()=>window.qualification.contexts)).length,0);
   const metrics=await frame.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1').innerText,
    conditions:document.querySelector('#conditions').innerText,submit:document.querySelector('#submit').getBoundingClientRect().toJSON(),
    clipped:[...document.querySelectorAll('button,select,summary,h1,h2')].filter(e=>e.getBoundingClientRect().width&&e.scrollWidth>e.clientWidth+2).map(e=>e.id||e.tagName)}));
   assert.equal(metrics.width,width);assert.ok(metrics.scrollWidth<=width);assert.deepEqual(metrics.clipped,[]);assert.ok(metrics.submit.width>0);
   await page.screenshot({path:resolve(output,lang+'-'+width+'-displayed.png'),fullPage:false});
   await frame.$eval('#conditions',e=>e.scrollIntoView({block:'start'}));
   await page.screenshot({path:resolve(output,lang+'-'+width+'-conditions.png'),fullPage:false});
   await frame.click('#submit');await frame.waitForFunction(()=>!document.querySelector('#ask').disabled);
   const context=await page.evaluate(()=>window.qualification.contexts);assert.equal(context.length,1);
   const data=JSON.parse(context[0].content[0].text.split('\n').slice(1).join('\n'));assert.equal(data.pack.lang,lang);assert.ok(data.pack.nonApplicabilityConditions.length);
   await frame.click('#ask');await frame.waitForFunction(()=>document.querySelector('#response').innerText.length>0);
   assert.equal((await page.evaluate(()=>window.qualification.messages)).length,1);
   await page.screenshot({path:resolve(output,lang+'-'+width+'-accepted.png'),fullPage:false});
   await frame.select('#language',lang==='fr'?'en':'fr');assert.equal(await frame.$eval('#submit',e=>e.disabled),true);
   assert.equal(await frame.$eval('#ask',e=>e.disabled),true);
   assert.deepEqual(errors,[]);cases.push({width,lang,metrics,contextUtf8Bytes:Buffer.byteLength(context[0].content[0].text,'utf8'),status:'PASS',host:'simulated',modelCalled:false});await page.close();
  }
 }
 for(const mode of ['refuse','unsupported']){
  const page=await browser.newPage();await page.setViewport({width:390,height:844});
  await page.goto('http://127.0.0.1:'+port+'/host?'+mode);
  await page.waitForFunction(()=>!!document.querySelector('iframe').contentDocument?.querySelector('#inspect:not([disabled])'));
  const frame=page.frames().find(f=>f.url().endsWith('/app'));await frame.click('#inspect');
  await frame.waitForFunction(()=>!document.querySelector('#content').hidden);
  if(mode==='refuse'){await frame.click('#submit');await frame.waitForFunction(()=>document.querySelector('#status').innerText.includes('non confirmée'));assert.equal(await frame.$eval('#ask',e=>e.disabled),true);}
  else assert.equal(await frame.$eval('#submit',e=>e.disabled),true);
  assert.equal((await page.evaluate(()=>window.qualification.contexts)).length,0);
  cases.push({mode,status:'PASS',host:'simulated'});await page.screenshot({path:resolve(output,mode+'-390.png')});await page.close();
 }
 for(const width of [390,780])for(const lang of ['fr','en'])for(const mode of ['short','full']){
  const page=await browser.newPage();await page.setViewport({width,height:844,deviceScaleFactor:1});
  await page.setRequestInterception(true);page.on('request',r=>new URL(r.url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+port+'/host');
  await page.waitForFunction(()=>!!document.querySelector('iframe').contentDocument?.querySelector('#inspect:not([disabled])'));
  let frame=page.frames().find(f=>f.url().endsWith('/app'));await frame.select('#language',lang);
  assert.equal(await frame.$eval('#d-enable',e=>e.checked),false);
  await frame.click('#d-heading');await frame.click('#d-enable');await frame.select('#d-mode',mode);
  if(mode==='full'){await frame.click('#inspect');await frame.waitForFunction(()=>!document.querySelector('#d-submit').disabled);}
  assert.equal((await page.evaluate(()=>window.qualification.contexts)).length,0);
  assert.equal(await frame.$eval('#submit',e=>e.disabled),true);assert.equal(await frame.$eval('#ask',e=>e.disabled),true);
  await frame.click('#d-submit');await frame.waitForFunction(()=>!document.querySelector('#d-ask').disabled);
  assert.equal(await frame.$eval('#submit',e=>e.disabled),true);assert.equal(await frame.$eval('#ask',e=>e.disabled),true);
  const contexts=await page.evaluate(()=>window.qualification.contexts);assert.equal(contexts.length,1);
  const text=contexts[0].content[0].text;const nonce=JSON.parse(text.split('\n')[1]).gcrDiagnosticNonce;assert.match(nonce,/^[a-f0-9]{32}$/);
  assert.equal((await frame.$eval('body',e=>e.innerText)).includes(nonce),false);
  assert.equal(JSON.stringify(await page.evaluate(()=>window.qualification.toolResults)).includes(nonce),false);
  if(mode==='short')assert.equal(text.split('\n\n').slice(1).join('\n\n'),'');
  else assert.equal(JSON.parse(text.slice(text.indexOf('\n\n')+2).split('\n').slice(1).join('\n')).pack.lang,lang);
  await frame.click('#d-ask');await frame.waitForFunction(()=>document.querySelector('#d-response').innerText.length>0);
  const messages=await page.evaluate(()=>window.qualification.messages);assert.equal(messages.length,1);assert.equal(JSON.stringify(messages).includes(nonce),false);
  const metrics=await frame.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('button,select,summary,label')].filter(e=>e.getBoundingClientRect().width&&e.scrollWidth>e.clientWidth+2).map(e=>e.id||e.tagName)}));
  assert.ok(metrics.scrollWidth<=width);assert.deepEqual(metrics.clipped,[]);
  await frame.$eval('#diagnostic',e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:resolve(output,'diagnostic-'+lang+'-'+mode+'-'+width+'.png')});
  await page.reload();await page.waitForFunction(()=>!!document.querySelector('iframe').contentDocument?.querySelector('#inspect:not([disabled])'));
  // Keep the observation window open for deferred replay; unit tests also drain all mocked timers.
  await new Promise(r=>setTimeout(r,600));
  frame=page.frames().find(f=>f.url().endsWith('/app'));assert.equal((await page.evaluate(()=>window.qualification.contexts)).length,0);
  assert.equal(await frame.$eval('#d-enable',e=>e.checked),false);assert.equal(await frame.$eval('#d-ask',e=>e.disabled),true);
  // Simulation complete. Only now reveal observer evidence, without sending a message.
  await frame.click('#d-heading');await frame.click('#d-observer-note');await frame.click('#d-observer');await frame.click('#d-reveal');
  const evidence=JSON.parse(await frame.$eval('#d-evidence',e=>e.textContent));assert.equal(evidence.trials.at(-1).expected,nonce);assert.equal(evidence.trials.at(-1).text,text);
  assert.equal((await page.evaluate(()=>window.qualification.contexts)).length,0);
  cases.push({width,lang,mode,status:'PASS',host:'simulated',modelCalled:false,metrics,textUtf8Bytes:Buffer.byteLength(text,'utf8'),reloadNewSubmissions:0});await page.close();
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify({host:'simulated AppBridge; real stdio companion; no model',cases},null,2));
 console.log('PASS browser cases: '+cases.length);
}finally{await browser?.close();await client.close();await new Promise(r=>server.close(r));}
