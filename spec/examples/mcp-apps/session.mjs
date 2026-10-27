// SPDX-License-Identifier: Apache-2.0
// UI lifecycle: an old asynchronous reply can never certify the current selection.
// This request contains only the inspected identity. The model-visible tool supplies the pack.
export function readPackPrompt(selection){
 const args=JSON.stringify({intentToken:selection.intentToken,lang:selection.lang,version:selection.version,expectedRoot:selection.expectedRoot});
 if(selection.lang==='fr')return 'Appelle une seule fois read_gcr_pack de gcr-fictional-context avec exactement ces arguments : '+args+'. La découverte de cet outil est permise si nécessaire. Utilise uniquement le texte renvoyé. Aucun autre outil, connecteur, fichier ou navigateur; ne visite aucune URL du résultat. Indique packId, lang, version et la chaîne d’applicabilité. Recopie les cinq listes activationConditions, nonApplicabilityConditions, requiredEvidence, forbiddenInferences et applicabilityAbuseBoundaries. Explique les preuves manquantes ou contradictoires et les limites de réservation, de paiement et de travaux. Identifie la source déclarée sans la consulter. Si la lecture échoue, indique la limite sans inventer de contenu. Arrête-toi après cette réponse.';
 if(selection.lang==='en')return 'Call read_gcr_pack from gcr-fictional-context exactly once with these exact arguments: '+args+'. Discovering this tool is allowed if needed. Use only the returned text. No other tools, connectors, files or browser; do not visit any URL in the result. Identify packId, lang, version and the applicability chain. Copy the five lists activationConditions, nonApplicabilityConditions, requiredEvidence, forbiddenInferences and applicabilityAbuseBoundaries. Explain missing or conflicting evidence and the limits on booking, payment and work. Identify the declared source without visiting it. If reading fails, state the limitation without inventing content. Stop after this response.';
 throw Error('unsupported_request_language');
}
export class PackSession {
  constructor({load,send,request,changed=()=>{}}){this.load=load;this.send=send;this.request=request;this.changed=changed;this.epoch=0;this.readPending=false;this.state={phase:'empty',selection:null,view:null,text:null,error:null,readRequest:'idle',readError:null};}
  select(selection){this.epoch++;this.state={phase:'selected',selection:{...selection},view:null,text:null,error:null,readRequest:'idle',readError:null};this.changed(this.state);}
  disconnect(){this.epoch++;this.state={...this.state,phase:'disconnected',view:null,text:null,error:'connection_closed',readRequest:'idle',readError:null};this.changed(this.state);}
  async inspect(){
    if(!this.state.selection)throw Error('selection_required');
    const epoch=++this.epoch;const wanted={...this.state.selection};
    this.state={...this.state,phase:'loading',view:null,text:null,error:null,readRequest:'idle',readError:null};this.changed(this.state);
    try {
      const result=await this.load(wanted);
      if(epoch!==this.epoch)return;
      const {view,contextText:text}=result?._meta?.gcr??{};
      const identity=view?.verification?.selection;
      if(result?.isError||!view||!identity||identity.intentToken!==wanted.intentToken||identity.lang!==wanted.lang||identity.version!==wanted.version||
         view.verification.corpusRootDigest!==wanted.expectedRoot||view.verification.snapshotMembership!=='verified-complete-records'||
         view.pack?.packId!==identity.packId||view.pack.lang!==wanted.lang||view.pack.version!==wanted.version||view.pack.intentToken!==wanted.intentToken||typeof text!=='string'||!text.length) throw Error('preview_refused_or_identity_mismatch');
      this.state={...this.state,phase:'displayed',view,text,error:null};
    } catch(error) {if(epoch!==this.epoch)return;this.state={...this.state,phase:'failed',view:null,text:null,error:error.message};}
    this.changed(this.state);
  }
  async submit(){
    if(this.readPending||this.state.phase!=='displayed'||this.state.readRequest!=='idle')throw Error('verified_preview_required');
    const epoch=this.epoch;const text=this.state.text;
    this.state={...this.state,phase:'submitted',error:null};this.changed(this.state);
    try {
      const result=await this.send(text);
      if(epoch!==this.epoch)return;
      if(!result||typeof result!=='object'||result.isError===true)throw Error('host_refused_or_missing_ack');
      this.state={...this.state,phase:'accepted'};
    } catch(error) {if(epoch!==this.epoch)return;this.state={...this.state,phase:'unconfirmed',error:error.message};}
    this.changed(this.state);
  }
  async requestRead(){
    if(this.readPending||this.state.phase!=='displayed'||this.state.readRequest!=='idle')throw Error('verified_preview_required');
    const epoch=this.epoch;const prompt=readPackPrompt(this.state.selection);
    this.readPending=true;
    this.state={...this.state,readRequest:'pending',readError:null};this.changed(this.state);
    try{
      const result=await this.request(prompt);
      if(epoch!==this.epoch)return;
      if(!result||typeof result!=='object'||Array.isArray(result)||result.isError===true)throw Error('host_refused_or_missing_ack');
      // A ui/message acknowledgement proves neither a tool call nor a model response.
      this.state={...this.state,readRequest:'prepared'};
    }catch(error){if(epoch!==this.epoch)return;this.state={...this.state,readRequest:'unconfirmed',readError:error.message};}
    finally{
      // Invalidating a selection cannot cancel a message already in flight.
      this.readPending=false;this.changed(this.state);
    }
  }
}
