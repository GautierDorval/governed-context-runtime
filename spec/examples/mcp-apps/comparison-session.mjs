// SPDX-License-Identifier: Apache-2.0
// Completely separate from PackSession: never touches its epoch, request or readPending.
export class ComparisonSession{
 constructor({load,changed=()=>{}}){this.load=load;this.changed=changed;this.epoch=0;this.state={phase:'empty',A:null,B:null,report:null,error:null};}
 select(A,B){this.epoch++;this.controller?.abort();this.state={phase:'selected',A:{...A},B:{...B},report:null,error:null};this.changed(this.state);}
 invalidate(phase='selected'){this.epoch++;this.controller?.abort();this.state={...this.state,phase,report:null,error:null};this.changed(this.state);}
 async compare(){
  const {A,B}=this.state;if(!A?.id||!B?.id)throw Error('comparison_pair_required');
  const epoch=++this.epoch;this.controller?.abort();this.controller=new AbortController();this.state={...this.state,phase:'loading',report:null,error:null};this.changed(this.state);
  try{
   const response=await this.load(A.id,B.id,{signal:this.controller.signal});if(epoch!==this.epoch)return;
   const report=response?._meta?.gcr?.comparison;
   if(response?.isError||report?.status!=='complete'||report.schemaVersion!=='gcr-comparison-report-1')throw Error(response?._meta?.gcr?.comparisonError??'comparison_refused');
   for(const [side,entry] of [['A',A],['B',B]]){
    const identity=report[side];
    if(!identity||identity.root!==entry.expectedRoot||identity.packBytesDigest!==entry.packBytesDigest||
     ['packId','intentToken','lang','version'].some(k=>identity.selection?.[k]!==entry[k]))throw Error('comparison_result_identity_mismatch');
   }
   if(report.rawCoverage?.complete!==true||report.presentationCoverage?.complete!==true)throw Error('comparison_coverage_incomplete');
   this.state={...this.state,phase:'ready',report,error:null};
  }catch(error){if(epoch!==this.epoch)return;this.state={...this.state,phase:'failed',report:null,error:error.message};}
  this.changed(this.state);
 }
}
