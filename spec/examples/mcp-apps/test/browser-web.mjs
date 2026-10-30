// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,relative,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [puppeteerPath,distArg,out]=process.argv.slice(2),dist=resolve(distArg);
const {default:puppeteer}=await import(pathToFileURL(puppeteerPath));
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain'};
const headerRules=[];let rule;
for(const line of (await readFile(join(dist,'_headers'),'utf8')).split(/\r?\n/)){
 if(!line.trim())continue;
 if(!/^\s/.test(line)){rule={path:line.trim(),headers:{}};headerRules.push(rule);}
 else{const match=line.match(/^\s+([^:]+):\s*(.*)$/);assert.ok(rule&&match);rule.headers[match[1]]=match[2];}
}
const headersFor=pathname=>Object.assign({},...headerRules.filter(r=>r.path.endsWith('*')?pathname.startsWith(r.path.slice(0,-1)):pathname===r.path).map(r=>r.headers));
const server=createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 const url=new URL(req.url,'http://localhost');let file=resolve(dist,'.'+decodeURIComponent(url.pathname));
 const rel=relative(dist,file);if(rel.startsWith('..'+sep)||rel==='..'){res.writeHead(403).end();return;}
 if(url.pathname.endsWith('/'))file=join(file,'index.html');
 const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store',...headersFor(url.pathname)}).end(req.method==='HEAD'?undefined:bytes);
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const manifest=JSON.parse(await readFile(join(dist,'catalog.json'),'utf8'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking','--dns-prefetch-disable']});
const cases=[];let mode='normal',intercepted=0;
try{
 for(const lang of ['fr','en'])for(const width of [390,1365]){
  const context=await browser.createBrowserContext(),page=await context.newPage();const errors=[];
  await page.evaluateOnNewDocument(()=>{window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>window.__cspViolations.push(event.violatedDirective));});
  page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width,height:width===390?844:900});
  await page.setRequestInterception(true);page.on('request',async request=>{try{
   const u=new URL(request.url());if(['blob:','data:'].includes(u.protocol))return await request.continue();
   if(u.origin!==origin||!['GET','HEAD'].includes(request.method()))return await request.abort();
   if(u.pathname.startsWith('/reports/')&&mode!=='normal'){
    intercepted++;const bytes=await readFile(join(dist,u.pathname));
    if(mode==='corrupt'){const altered=Buffer.from(bytes);altered[altered.length-2]^=1;return await request.respond({status:200,contentType:'application/json',body:altered});}
    if(mode==='delay')await new Promise(r=>setTimeout(r,500));
   }
   if(!request.isInterceptResolutionHandled())await request.continue();
  }catch{if(!request.isInterceptResolutionHandled())await request.abort();}});
  const navigation=await page.goto(origin+'/'+lang+'/',{waitUntil:'load'});assert.equal(navigation.status(),200);assert.ok(navigation.headers()['content-security-policy']?.includes("connect-src 'self'"));
  await page.waitForFunction(()=>!document.getElementById('c-run').disabled);
  assert.equal(await page.$eval('html',n=>n.lang),lang);
  assert.equal(await page.$eval('nav a[aria-current="page"]',n=>n.lang),lang);
  await page.screenshot({path:join(out,lang+'-'+width+'-ready.png')});
  for(const A of ['reference-'+lang,'variant-'+lang])for(const B of ['reference-'+lang,'variant-'+lang]){
   await page.select('#c-a',A);await page.select('#c-b',B);await page.click('#c-run');
   await page.waitForFunction(()=>!document.getElementById('c-result').hidden);
   const expected=manifest.reports.find(r=>r.A===A&&r.B===B);
   const metrics=await page.evaluate(async()=>{
    const text=document.getElementById('c-export-text').textContent,report=JSON.parse(text);
    const exportLink=document.getElementById('c-download');const exported=text;
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(exported)))].map(n=>n.toString(16).padStart(2,'0')).join('');
    return {scrollWidth:document.documentElement.scrollWidth,width:innerWidth,operations:report.operations.length,rendered:document.querySelectorAll('[data-operation]').length,digest,download:exportLink.download,status:document.getElementById('c-status').textContent};
   });
   assert.ok(metrics.scrollWidth<=width+1);assert.equal(metrics.operations,expected.operations);assert.equal(metrics.rendered,expected.operations);assert.equal(metrics.digest,expected.sha256);assert.equal(metrics.download,'gcr-comparison.json');
   if(A.startsWith('reference')&&B.startsWith('variant')){
    await page.$eval('#c-result',e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:join(out,lang+'-'+width+'-result.png')});
    const filter=await page.$$eval('#c-filter option',n=>n[1]?.value);if(filter){await page.select('#c-filter',filter);assert.ok((await page.$eval('#c-shown',n=>n.textContent)).includes(' / '));await page.select('#c-filter','all');}
    await page.$eval('#c-export-heading',e=>{e.parentElement.open=true;e.scrollIntoView({block:'start',behavior:'instant'});});await page.screenshot({path:join(out,lang+'-'+width+'-export.png')});
   }
   const downloadPath=join(out,'downloads',lang+'-'+width+'-'+A+'-'+B);await mkdir(downloadPath,{recursive:true});
   await context.setDownloadBehavior({policy:'allow',downloadPath});
   await page.$eval('#c-export-heading',e=>{e.parentElement.open=true;});await page.click('#c-download');
   let downloaded;for(let attempt=0;attempt<200;attempt++){try{downloaded=await readFile(join(downloadPath,'gcr-comparison.json'));break;}catch{await new Promise(r=>setTimeout(r,50));}}
   assert.ok(downloaded,'Browser download missing');const downloadDigest=createHash('sha256').update(downloaded).digest('hex');assert.equal(downloadDigest,expected.sha256);
   assert.deepEqual(await page.evaluate(()=>window.__cspViolations),[]);
   cases.push({lang,width,A,B,status:'PASS',metrics,download:{bytes:downloaded.length,sha256:downloadDigest,method:'actual browser click'},csp:true});
  }
  mode='corrupt';await page.select('#c-a','reference-'+lang);await page.select('#c-b','variant-'+lang);await page.click('#c-run');
  await page.waitForFunction(()=>document.getElementById('c-status').textContent.includes('comparison_digest_mismatch'));
  assert.equal(await page.$eval('#c-result',n=>n.hidden),true);
  mode='delay';const before=intercepted;await page.click('#c-run');
  for(let i=0;intercepted===before&&i<30;i++)await new Promise(r=>setTimeout(r,10));
  await page.click('#c-cancel');await new Promise(r=>setTimeout(r,550));
  assert.equal(await page.$eval('#c-result',n=>n.hidden),true);assert.equal(await page.$eval('#c-run',n=>n.disabled),false);
  mode='normal';assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(join(out,'results.json'),JSON.stringify({status:'PASS',cases,negativeCases:8,scope:'Real local HTTP browser; eight ordered same-language pairs at two widths; actual download bytes under published CSP; altered reports and cancelled loading refused.'},null,2)+'\n');console.log('PASS 16 browser pairs and 8 refusal/cancellation cases.');
}catch(error){await writeFile(join(out,'failure.json'),JSON.stringify({error:error.stack,cases},null,2)+'\n');throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
