// SPDX-License-Identifier: Apache-2.0
import {App} from '@modelcontextprotocol/ext-apps';
import {PackSession} from './session.mjs';
import {bindDiagnostic} from './diagnostic-ui.mjs';
import {bindComparison} from './comparison-ui.mjs';
let diagnosticUI,comparisonUI;
const app=new App({name:'GCR whole-pack selector',version:'0.1.0-dev'},{});
const el=id=>document.getElementById(id);
let catalog=[],caps={},connected=false,hostVersion=null;
const messages={
 fr:{eyebrow:'Exemple fictif · prototype local',heading:'Choisir un contexte pour l’assistant',intro:'Inspectez un pack entier, ses conditions et ses sources avant de le fournir à la conversation.',
 'read-pack':'Faire lire ce pack à l’assistant','text-note':'Prépare une demande de lecture du pack entier et de ses sources archivées par l’outil texte. Confirmez l’envoi dans la conversation si nécessaire. La lecture et la réponse doivent être observées dans la conversation.',
 'native-heading':'Canal natif expérimental',readPending:'Préparation de la demande de lecture…',readPrepared:'Demande préparée par l’hôte. Confirmez son envoi si nécessaire. Lecture du pack et réponse non observées par le composant.',readUnconfirmed:'Demande non confirmée. L’hôte peut l’avoir reçue. Vérifiez la conversation avant de réinspecter pour une nouvelle tentative.',readUnavailable:'L’hôte ne déclare pas la préparation de messages texte. Demandez manuellement read_gcr_pack dans la conversation avec l’identité du pack inspecté.',
 'intent-label':'Besoin','language-label':'Langue du contexte',inspect:'Inspecter ce pack',submit:'Soumettre par le canal natif',ask:'Demander une explication',
 transmission:'L’aperçu détaillé reste dans le composant et chez son hôte; son identité figure dans le résultat d’outil. Le bouton fournit une projection texte complète du pack et de ses sources archivées. Un contexte déjà accepté peut rester dans l’historique.',
 'content-heading':'Contenu du contexte sélectionné',limits:'Vérification d’intégrité de l’exemple fictif. Elle ne prouve ni vérité, ni autorité, ni permission, ni fidélité d’une réponse. Aucune action n’est autorisée.',
 'conditions-heading':'Conditions et exclusions','declared-heading':'Contenu déclaré complet','sources-heading':'Sources archivées','sources-note':'Octets archivés disponibles dans cet exemple. Les URL déclarées ne sont pas consultées; aucun lien de source n’est suivi automatiquement.',
 'proof-heading':'Identité et détails de vérification','host-heading':'Client et transmission',
 selected:'Pack sélectionné. Inspectez-le avant de le soumettre.',loading:'Vérification du pack entier et de ses archives…',displayed:'Pack affiché et intégrité vérifiée.',
 submitted:'Soumis à l’hôte. Accusé de réception en attente…',accepted:'Accusé de réception de l’hôte reçu. Usage du contexte par le modèle non vérifié.',
 failed:'Vérification ou chargement refusé. Aucun contexte vérifié disponible.',unconfirmed:'Transmission non confirmée. L’hôte peut avoir reçu le contexte; aucun succès n’est affirmé. Réinspectez avant une nouvelle tentative.',
 disconnected:'Connexion fermée. État précédent invalidé.',empty:'Connexion à l’hôte…',
 unsupported:'L’hôte ne déclare pas la mise à jour de contexte texte. Utilisez le parcours texte read_gcr_pack.',
 askText:'Explique les conditions et exclusions du service fictif Atelier Boréal dans le contexte GCR fourni. N’en déduis aucune permission d’action.',
 requestAccepted:'Demande préparée par l’hôte. Confirmez son envoi dans la conversation si nécessaire, puis observez la réponse; ce composant ne peut pas la lire.',
 requestFailed:'Demande refusée ou non confirmée. Aucune réponse observée.'},
 en:{eyebrow:'Fictional example · local prototype',heading:'Choose context for the assistant',intro:'Inspect a whole pack, its conditions and archived sources before supplying it to the conversation.',
 'read-pack':'Have the assistant read this pack','text-note':'Prepares a request to read the whole pack and its archived sources through the text tool. Confirm sending in the conversation if required. Observe the actual read and response in the conversation.',
 'native-heading':'Experimental native channel',readPending:'Preparing the read request…',readPrepared:'Request prepared by the host. Confirm sending if required. The component has not observed a pack read or a response.',readUnconfirmed:'Request unconfirmed. The host may have received it. Check the conversation before inspecting again to retry.',readUnavailable:'This host does not declare text message preparation. Ask for read_gcr_pack manually in the conversation using the inspected pack identity.',
 'intent-label':'Need','language-label':'Context language',inspect:'Inspect this pack',submit:'Submit through the native channel',ask:'Ask for an explanation',
 transmission:'The detailed preview stays with the component and its host; its identity appears in the tool result. The button supplies a complete text projection of the pack and its archived sources. Previously accepted context may remain in conversation history.',
 'content-heading':'Selected context contents',limits:'Integrity verification of a fictional example. It establishes neither truth, authority, permission nor answer fidelity. No action is authorized.',
 'conditions-heading':'Conditions and exclusions','declared-heading':'Complete declared content','sources-heading':'Archived sources','sources-note':'Archived bytes available in this example. Declared URLs are not consulted; source links are never followed automatically.',
 'proof-heading':'Identity and verification details','host-heading':'Client and transmission',
 selected:'Pack selected. Inspect it before submitting.',loading:'Verifying the whole pack and its archives…',displayed:'Pack displayed and integrity verified.',
 submitted:'Submitted to the host. Waiting for acknowledgement…',accepted:'Host acknowledgement received. Model use of the context remains unverified.',
 failed:'Verification or loading refused. No verified context is available.',unconfirmed:'Transmission unconfirmed. The host may have received the context; no success is claimed. Inspect again before retrying.',
 disconnected:'Connection closed. Previous state invalidated.',empty:'Connecting to host…',
 unsupported:'This host does not declare text context updates. Use the read_gcr_pack text fallback.',
 askText:'Explain the conditions and exclusions of the fictional Boreal Workshop service in the supplied GCR context. Do not infer permission for any action.',
 requestAccepted:'Request prepared by the host. Confirm sending in the conversation if required, then observe the answer; this component cannot read it.',
 requestFailed:'Request refused or unconfirmed. No response observed.'}
};
const lang=()=>el('language').value;
const t=()=>messages[lang()];
function localize(){
 document.documentElement.lang=lang();diagnosticUI?.localize();comparisonUI?.localize();
 for(const [id,value] of Object.entries(t())){const node=el(id);if(node)node.textContent=value;}
 el('intent').options[0].textContent=lang()==='fr'?'Limites du service Atelier Boréal':'Boreal Workshop service limits';
}
function render(state){
 el('status').textContent=t()[state.phase]??state.phase;
 if(state.error)el('status').textContent+=' ('+state.error+')';
 el('inspect').disabled=!connected||!catalog.length||state.phase==='submitted'||session.readPending||!!diagnosticUI?.busy();
 el('language').disabled=state.phase==='submitted'||session.readPending||!!diagnosticUI?.busy();el('intent').disabled=state.phase==='submitted'||session.readPending||!!diagnosticUI?.busy();
 el('submit').disabled=state.phase!=='displayed'||session.readPending||state.readRequest!=='idle'||!caps.updateModelContext?.text||!!diagnosticUI?.enabled();
 el('read-pack').disabled=!connected||state.phase!=='displayed'||session.readPending||state.readRequest!=='idle'||!caps.message?.text||!!diagnosticUI?.enabled();
 el('read-request').textContent=session.readPending?t().readPending:({pending:t().readPending,prepared:t().readPrepared,unconfirmed:t().readUnconfirmed})[state.readRequest]??(state.phase==='displayed'&&!caps.message?.text?t().readUnavailable:'');
 el('ask').disabled=state.phase!=='accepted'||!caps.message?.text||!!diagnosticUI?.enabled();
 el('content').hidden=!state.view;
 el('identity').textContent=state.view?state.view.pack.packId+' · '+state.view.pack.lang+' · '+state.view.pack.version:state.selection?state.selection.intentToken+' · '+state.selection.lang+' · '+state.selection.version:'';
 if(state.phase!=='accepted')el('response').textContent='';
 el('transmission').textContent=t().transmission+(connected&&!caps.updateModelContext?.text?' '+t().unsupported:'');
 diagnosticUI?.render();
 if(!state.view)return;
 const view=state.view;
 el('declared').textContent=JSON.stringify(view.pack,null,2);
 el('proof').textContent=JSON.stringify({verification:view.verification,trustScope:view.trustScope,manifest:view.manifest,units:view.units,originalBytes:view.originalBytes},null,2);
 el('conditions').replaceChildren();
 for(const [key,heading] of Object.entries(lang()==='fr'?{
 activationConditions:'Conditions d’application',nonApplicabilityConditions:'Cas exclus',requiredEvidence:'Preuves nécessaires',forbiddenInferences:'Déductions interdites',applicabilityAbuseBoundaries:'Limites d’usage'
 }:{activationConditions:'Activation conditions',nonApplicabilityConditions:'Excluded cases',requiredEvidence:'Required evidence',forbiddenInferences:'Forbidden inferences',applicabilityAbuseBoundaries:'Use boundaries'})){
  const h=document.createElement('h2');h.textContent=heading;el('conditions').append(h);
  const pre=document.createElement('pre');pre.textContent=JSON.stringify(view.pack[key],null,2);el('conditions').append(pre);
 }
 el('sources').replaceChildren();
 for(const source of view.archivedSources){const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('pre');s.textContent=source.sourcePath;p.textContent=source.repositoryDigest+'\n'+source.text;d.append(s,p);el('sources').append(d);}
}
const session=new PackSession({
 load:args=>app.callServerTool({name:'inspect_gcr_pack',arguments:args},{timeout:15000}),
 send:text=>app.updateModelContext({content:[{type:'text',text}]},{timeout:15000}),
 request:text=>app.sendMessage({role:'user',content:[{type:'text',text}]},{timeout:15000}),
 changed:render
});
diagnosticUI=bindDiagnostic({app,session,lang,environment:()=>({connected,caps,hostVersion}),render,select});
function select(){diagnosticUI?.invalidate();localize();const entry=catalog.find(c=>c.lang===lang());if(!entry)return;const {label,...selection}=entry;session.select(selection);}
comparisonUI=bindComparison({app,lang,connected:()=>connected});
app.ontoolresult=result=>{if(result?._meta?.gcr?.catalog){catalog=result._meta.gcr.catalog;comparisonUI.setCatalog(result._meta.gcr.comparisonCatalog??[]);select();}};
app.onclose=()=>{connected=false;diagnosticUI?.invalidate();comparisonUI?.disconnect();session.disconnect();};
app.onerror=()=>{connected=false;diagnosticUI?.invalidate();comparisonUI?.disconnect();session.disconnect();};
el('language').addEventListener('change',select);
el('inspect').addEventListener('click',()=>{diagnosticUI.invalidate();return session.inspect();});
el('submit').addEventListener('click',()=>session.submit());
el('read-pack').addEventListener('click',()=>session.requestRead());
el('ask').addEventListener('click',async()=>{
 const epoch=session.epoch;el('ask').disabled=true;
 try{const result=await app.sendMessage({role:'user',content:[{type:'text',text:t().askText}]},{timeout:15000});
 if(epoch===session.epoch)el('response').textContent=result?.isError?t().requestFailed:t().requestAccepted;
 }catch{if(epoch===session.epoch)el('response').textContent=t().requestFailed;}
});
localize();render(session.state);
try{await app.connect();caps=app.getHostCapabilities()??{};hostVersion=app.getHostVersion();connected=true;comparisonUI?.refresh();
 el('host').textContent=JSON.stringify({host:hostVersion,capabilities:caps,preview:'UI metadata: readable by host; not secret',submission:'ui/update-model-context',followUp:'ui/message',textReadRequest:'ui/message -> model-visible read_gcr_pack',toolReadObserved:false,responseObserved:false},null,2);render(session.state);
}catch(error){connected=false;diagnosticUI?.invalidate();comparisonUI?.disconnect();session.disconnect();}
