// SPDX-License-Identifier: Apache-2.0
import {build} from 'esbuild';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const result=await build({entryPoints:[resolve(root,'ui.mjs')],bundle:true,write:false,format:'esm',absWorkingDir:root,tsconfigRaw:{},platform:'browser',target:'es2022',legalComments:'inline'});
const script=result.outputFiles[0].text.replaceAll('</script','<\\/script');
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const notices=[];
for(const [path,metadata] of Object.entries(lock.packages)){
 if(!path)continue;
 let names;try{names=await readdir(resolve(root,path));}catch(error){if(error.code==='ENOENT'&&metadata.optional)continue;throw error;}
 const licenseFiles=names.filter(n=>/^(license|licence|notice|copying)(\.|$)/i.test(n));
 for(const name of licenseFiles)notices.push(path+' @ '+metadata.version+' / '+name+'\n'+await readFile(resolve(root,path,name),'utf8'));
}
if(!notices.length)throw Error('third_party_notices_missing');
const noticeText=notices.join('\n\n========================================\n\n');
await writeFile(resolve(root,'third-party-notices.txt'),noticeText);
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const template=await readFile(resolve(root,'ui.html'),'utf8');
const html=template.replace('<!-- APP_SCRIPT -->',()=>'<script type="module">'+script+'</script>')
 .replace('</main>',()=>'<details><summary>Third-party licences / Licences tierces</summary><pre>'+escape(noticeText)+'</pre></details></main>');
await writeFile(resolve(root,'app.html'),html);
console.log('Built local MCP Apps resource; dependency licence texts and notices embedded.');
