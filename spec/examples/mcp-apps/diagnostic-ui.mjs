// SPDX-License-Identifier: Apache-2.0
import {DiagnosticSession,diagnosticPrompt} from './diagnostic.mjs';
const copy={
 fr:{'d-heading':'Diagnostic facultatif','d-enable-label':'Activer le diagnostic (désactivé par défaut)','d-mode-label':'Charge à soumettre','d-short':'Court : jeton seul, aucun pack','d-full':'Complet : jeton et projection entière du pack',
 'd-submit':'Soumettre un nouvel essai','d-ask':'Préparer la demande du jeton','d-note':'Une soumission explicite remplace la contribution précédente. Attendez la fin du tour précédent. Le jeton reste masqué. Confirmez l’envoi du message dans la conversation. Aucune réponse du modèle n’est lue par ce composant.',
 'd-observer-label':'Observateur : la réponse et la variante de rechargement sont terminées (ou cette variante est exclue).','d-reveal':'Révéler la preuve à l’observateur','d-observer-note':'Ne révélez rien avant la fin de la réponse et du rechargement éventuel. Ne transmettez jamais cette preuve au modèle testé. La trace reste en mémoire et, si disponible, dans le stockage de session du composant, au maximum quatre essais. Ce stockage n’est pas une frontière de sécurité vis-à-vis de l’hôte.',
 idle:'Prêt pour un essai explicite. Aucun jeton soumis.',preparing:'Préparation de l’essai…',submitted:'Soumis. Accusé en attente.',acknowledged:'Accusé reçu. Réponse et reproduction du jeton non évaluées.',failed:'Essai refusé ou transmission non confirmée.',
 requestAccepted:'Demande préparée. Confirmez son envoi dans la conversation, puis consignez la réponse.',requestFailed:'Message non confirmé. Consignez l’échec; aucun résultat modèle établi.',unavailable:'Stockage de session indisponible : la preuve peut être perdue au rechargement.',unsupported:'Capacité texte non déclarée : diagnostic indisponible.'},
 en:{'d-heading':'Optional diagnostic','d-enable-label':'Enable diagnostics (off by default)','d-mode-label':'Payload to submit','d-short':'Short: nonce only, no pack','d-full':'Full: nonce and entire pack projection',
 'd-submit':'Submit a new trial','d-ask':'Prepare the nonce request','d-note':'Each explicit submission replaces the previous contribution. Wait for the preceding turn to finish. The nonce stays hidden. Confirm sending the message in the conversation. This component cannot read the model’s response.',
 'd-observer-label':'Observer: the response and reload variant are complete (or the variant is excluded).','d-reveal':'Reveal observer evidence','d-observer-note':'Reveal nothing until the response and any reload trial are complete. Never send this evidence to the tested model. Up to four trials remain in memory and, when available, component session storage. This storage is not a security boundary against the host.',
 idle:'Ready for an explicit trial. No nonce submitted.',preparing:'Preparing the trial…',submitted:'Submitted. Awaiting acknowledgement.',acknowledged:'Acknowledgement received. Response and nonce reproduction not evaluated.',failed:'Trial refused or transmission unconfirmed.',
 requestAccepted:'Request prepared. Confirm sending it in the conversation, then record the response.',requestFailed:'Message unconfirmed. Record the failure; no model result established.',unavailable:'Session storage unavailable: evidence may be lost on reload.',unsupported:'Text context capability not declared: diagnostics unavailable.'}
};
export function bindDiagnostic({app,session,lang,environment,render,select}) {
 const el=id=>document.getElementById(id);const t=()=>copy[lang()];
 let storage=null;try{storage=globalThis.sessionStorage;}catch{}
 const diagnostic=new DiagnosticSession({send:text=>app.updateModelContext({content:[{type:'text',text}]},{timeout:15000}),storage,changed:()=>render(session.state)});
 const enabled=()=>el('d-enable').checked;
 const busy=()=>['preparing','submitted'].includes(diagnostic.state.phase);
 function clear(){diagnostic.invalidate();el('d-response').textContent='';el('d-evidence').textContent='';el('d-evidence').hidden=true;el('d-observer').checked=false;}
 function paint(){
  const env=environment();const state=diagnostic.state;
  el('d-controls').hidden=!enabled();el('d-enable').disabled=busy()||session.state.phase==='submitted';
  el('d-mode').disabled=busy();
  el('d-submit').disabled=!enabled()||busy()||!env.connected||!env.caps.updateModelContext?.text||(el('d-mode').value==='full'&&session.state.phase!=='displayed');
  el('d-ask').disabled=!enabled()||state.phase!=='acknowledged'||!env.connected||!env.caps.message?.text;
  el('d-reveal').disabled=busy()||!el('d-observer').checked;
  el('d-status').textContent=t()[state.phase]+(state.error?' ('+state.error+')':'')+(state.trialId?' '+state.trialId+' · '+state.textUtf8Bytes+' UTF-8 bytes':'');
  if(state.observerStorage===false)el('d-status').textContent+=' '+t().unavailable;
  if(env.connected&&!env.caps.updateModelContext?.text)el('d-status').textContent+=' '+t().unsupported;
 }
 el('d-enable').addEventListener('change',()=>{clear();select();});
 el('d-mode').addEventListener('change',()=>{clear();render(session.state);});
 el('d-submit').addEventListener('click',async()=>{
  el('d-evidence').hidden=true;el('d-evidence').textContent='';el('d-observer').checked=false;el('d-response').textContent='';
  try{const env=environment();await diagnostic.submit({mode:el('d-mode').value,lang:lang(),packSession:session,connected:env.connected,textCapability:!!env.caps.updateModelContext?.text});}
  catch{el('d-status').textContent=t().failed;}
 });
 el('d-ask').addEventListener('click',async()=>{
  const epoch=diagnostic.epoch;el('d-ask').disabled=true;
  try{const result=await app.sendMessage({role:'user',content:[{type:'text',text:diagnosticPrompt[lang()]}]},{timeout:15000});
   if(epoch===diagnostic.epoch)el('d-response').textContent=result?.isError?t().requestFailed:t().requestAccepted;
  }catch{if(epoch===diagnostic.epoch)el('d-response').textContent=t().requestFailed;}
 });
 el('d-observer').addEventListener('change',paint);
 el('d-reveal').addEventListener('click',()=>{
  const evidence=diagnostic.observerEvidence({evaluationAndReloadComplete:el('d-observer').checked});
  el('d-evidence').textContent=JSON.stringify({host:environment().hostVersion,capabilities:environment().caps,trials:evidence,responseObservedByComponent:false},null,2);el('d-evidence').hidden=false;
 });
 return {enabled,busy,invalidate:clear,render:paint,localize:()=>{for(const [id,value]of Object.entries(t())){const node=el(id);if(node)node.textContent=value;}}};
}
