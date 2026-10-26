// SPDX-License-Identifier: Apache-2.0
// UI lifecycle: an old asynchronous reply can never certify the current selection.
export class PackSession {
  constructor({load,send,changed=()=>{}}){this.load=load;this.send=send;this.changed=changed;this.epoch=0;this.state={phase:'empty',selection:null,view:null,text:null,error:null};}
  select(selection){this.epoch++;this.state={phase:'selected',selection:{...selection},view:null,text:null,error:null};this.changed(this.state);}
  disconnect(){this.epoch++;this.state={...this.state,phase:'disconnected',view:null,text:null,error:'connection_closed'};this.changed(this.state);}
  async inspect(){
    if(!this.state.selection)throw Error('selection_required');
    const epoch=++this.epoch;const wanted={...this.state.selection};
    this.state={...this.state,phase:'loading',view:null,text:null,error:null};this.changed(this.state);
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
    if(this.state.phase!=='displayed')throw Error('verified_preview_required');
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
}
