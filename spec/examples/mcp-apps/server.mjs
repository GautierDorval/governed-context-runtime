// SPDX-License-Identifier: Apache-2.0
import {McpServer} from '@modelcontextprotocol/server';
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import {registerAppTool,registerAppResource,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {catalog,inspect,contextText} from './data.mjs';
import {comparisonCatalog} from './comparison-data.mjs';
import {runComparison} from './comparison-runner.mjs';
const uiHtml=await readFile(new URL('./app.html',import.meta.url),'utf8');
// A changed build must not reuse a host's cached resource.
export const RESOURCE='ui://gcr/pack-selector-'+createHash('sha256').update(uiHtml).digest('hex')+'.html';
const schema=z.object({intentToken:z.literal('representation-gap'),lang:z.enum(['fr','en']),version:z.literal('semantic-boundaries-1'),expectedRoot:z.string()}).strict();
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const errorResult=error=>({isError:true,content:[{type:'text',text:'GCR verification or selection refused: '+error.message+'. No verified context supplied.'}]});
export function createServer() {
  const server=new McpServer({name:'gcr-fictional-context-companion',version:'0.1.0-dev'});
  registerAppTool(server,'open_gcr_selector',{
    title:'Inspect a fictional GCR context',
    description:'Open a bilingual selector of a fictional whole context pack. Opening sends only the catalog, never the pack. If no UI is available, use read_gcr_pack with an exact catalog selection.',
    inputSchema:z.object({}).strict(),annotations,
    _meta:{ui:{resourceUri:RESOURCE,visibility:['model']}}
  },async()=>({content:[{type:'text',text:'Fictional GCR catalog. No pack has been sent. For text-only access call read_gcr_pack with intentToken, lang, version and expectedRoot from one entry; omit its display label. The shared root covers a corpus with distinct language-specific pack identities:\n'+JSON.stringify(catalog)}],_meta:{gcr:{catalog,comparisonCatalog}}}));
  registerAppTool(server,'inspect_gcr_pack',{
    title:'Inspect the selected whole pack',
    description:'UI preview: full verification against the separately pinned fictional anchor. Content stays in the UI metadata; the host can read it. No source URLs are fetched.',
    inputSchema:schema,annotations,_meta:{ui:{resourceUri:RESOURCE,visibility:['app']}}
  },async args=>{
    try {
      const view=await inspect(args);
      return {content:[{type:'text',text:'Displayed fictional pack '+view.pack.packId+'. Corpus root '+view.verification.corpusRootDigest+'. This preview does not submit the full context to the model.'}],
        _meta:{gcr:{view,contextText:contextText(view)}}};
    } catch(error){return errorResult(error);}
  });
  registerAppTool(server,'read_gcr_pack',{
    title:'Read one verified fictional pack as text',
    description:'Text fallback. This call sends the FULL selected pack, its conditions, exclusions, units, manifest and archived sources to the model immediately. Use only when a user asks to supply that context. No semantic fidelity or permission is established.',
    inputSchema:schema,annotations,_meta:{ui:{visibility:['model']}}
  },async args=>{try{return {content:[{type:'text',text:contextText(await inspect(args))}]};}catch(error){return errorResult(error);}});
  registerAppTool(server,'compare_gcr_packs',{
    title:'Compare two admitted fictional states',
    description:'UI-only comparison with full snapshot integrity and separate JSON Schema validation. No model context update, network resolution or publication succession.',
    inputSchema:z.object({A:z.enum(comparisonCatalog.map(c=>c.id)),B:z.enum(comparisonCatalog.map(c=>c.id))}).strict(),
    annotations,_meta:{ui:{resourceUri:RESOURCE,visibility:['app']}}
  },async ({A,B},extra)=>{try{const comparison=await runComparison(A,B,{signal:extra?.signal});return {content:[{type:'text',text:'Local comparison completed. Detailed results remain in host-readable UI metadata.'}],_meta:{gcr:{comparison}}};}
   catch(error){return {isError:true,content:[{type:'text',text:'Comparison refused; no valid comparison supplied.'}],_meta:{gcr:{comparisonError:error.message}}};}});
  const ui={csp:{connectDomains:[],resourceDomains:[]},permissions:{},prefersBorder:true};
  registerAppResource(server,'GCR fictional context selector',RESOURCE,{mimeType:RESOURCE_MIME_TYPE,_meta:{ui}},
    async()=>({contents:[{uri:RESOURCE,mimeType:RESOURCE_MIME_TYPE,text:uiHtml,_meta:{ui}}]}));
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  await createServer().connect(new StdioServerTransport());
}
