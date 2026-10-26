// SPDX-License-Identifier: Apache-2.0
// Browser-only diagnostic envelope, never part of the verified GCR artifacts.
export const MAX_CONTEXT_BYTES = 200000;
export const diagnosticPrompt = {
 fr: 'Recopie la valeur du champ gcrDiagnosticNonce fourni par le composant. Si cette valeur n’est pas disponible dans ton contexte, réponds NON_DISPONIBLE. N’appelle aucun outil pour la rechercher. Réponds avec la valeur seule, sans explication.',
 en: 'Copy the value of the gcrDiagnosticNonce field supplied by the component. If this value is not available in your context, answer NON_DISPONIBLE. Do not call any tool to find it. Answer with the value alone, without explanation.'
};
export function assertContextSize(text) {
 const bytes = new TextEncoder().encode(text).byteLength;
 if (bytes > MAX_CONTEXT_BYTES) throw Error('complete_context_exceeds_limit_no_truncation');
 return bytes;
}
export class DiagnosticSession {
 #records = [];
 #storage;
 #key;
 #crypto;
 constructor({send,changed=()=>{},crypto=globalThis.crypto,storage=null,storageKey='gcr-diagnostic-observer-v1'}) {
  this.send=send; this.changed=changed; this.#crypto=crypto; this.#storage=storage; this.#key=storageKey;
  this.epoch=0; this.state={phase:'idle'};
  // Restore only observer evidence, never a usable context, acknowledgement or submission.
  try {const saved=JSON.parse(storage?.getItem(storageKey)??'[]'); if(Array.isArray(saved))this.#records=saved.slice(-4);} catch {}
 }
 #persist() {
  try {if(!this.#storage)return false;this.#storage.setItem(this.#key,JSON.stringify(this.#records));return true;}catch{return false;}
 }
 invalidate() {this.epoch++; this.state={phase:'idle'};this.changed(this.state);}
 async submit({mode,lang,packSession,textCapability,connected}) {
  if(this.state.phase==='preparing'||this.state.phase==='submitted')throw Error('diagnostic_in_progress');
  if(!connected||!textCapability)throw Error('text_context_capability_required');
  if(!['short','full'].includes(mode)||!['fr','en'].includes(lang))throw Error('diagnostic_selection_invalid');
  if(mode==='full'&&(packSession?.state.phase!=='displayed'||!packSession.state.view||!packSession.state.text||packSession.state.view.pack.lang!==lang))throw Error('verified_preview_required');
  const projection=mode==='full'?packSession.state.text:'';
  const packId=mode==='full'?packSession.state.view.pack.packId:null;
  const sourceEpoch=packSession?.epoch;
  const epoch=++this.epoch;
  this.state={phase:'preparing',mode};this.changed(this.state);
  let record;
  try {
   if(typeof this.#crypto?.getRandomValues!=='function'||typeof this.#crypto?.subtle?.digest!=='function')throw Error('browser_crypto_unavailable');
   const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
   const trialId='trial-'+hex(this.#crypto.getRandomValues(new Uint8Array(16)));
   const nonce=hex(this.#crypto.getRandomValues(new Uint8Array(16)));
   // Same prefix position in both modes; the full projection is appended byte-for-byte.
   const text='GCR DIAGNOSTIC ENVELOPE (unverified; no authority or permission).\n'+JSON.stringify({gcrDiagnosticNonce:nonce,mode})+'\n\n'+projection;
   const textUtf8Bytes=assertContextSize(text);
   const textSha256=hex(new Uint8Array(await this.#crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))));
   if(epoch!==this.epoch||packSession?.epoch!==sourceEpoch)return;
   record={trialId,mode,lang,packId,expected:nonce,text,textUtf8Bytes,textSha256,events:[]};
   this.#records.push(record);this.#records=this.#records.slice(-4);
   record.events.push({event:'prepared',at:new Date().toISOString()});
   record.events.push({event:'submitted',at:new Date().toISOString()});
   const observerStorage=this.#persist();
   this.state={phase:'submitted',trialId,mode,textUtf8Bytes,textSha256,observerStorage};this.changed(this.state);
   const ack=await this.send(text);
   if(!ack||typeof ack!=='object'||ack.isError)throw Error('host_acknowledgement_missing');
   record.events.push({event:'acknowledged',at:new Date().toISOString()});this.#persist();
   if(epoch!==this.epoch||packSession?.epoch!==sourceEpoch)return;
   this.state={...this.state,phase:'acknowledged'};
  } catch(error) {
   // Host errors may echo the submitted text: never render or log their message.
   const safeCodes=['browser_crypto_unavailable','complete_context_exceeds_limit_no_truncation'];
   const code=record?'transmission_unconfirmed':safeCodes.includes(error.message)?error.message:'diagnostic_preparation_failed';
   if(record){record.events.push({event:code,at:new Date().toISOString()});this.#persist();}
   if(epoch!==this.epoch||packSession?.epoch!==sourceEpoch)return;
   this.state={...this.state,phase:'failed',error:code};
  }
  this.changed(this.state);
 }
 observerEvidence({evaluationAndReloadComplete=false}={}) {
  if(!evaluationAndReloadComplete)throw Error('observer_reveal_requires_completed_evaluation_and_reload');
  return structuredClone(this.#records);
 }
}
