// SPDX-License-Identifier: Apache-2.0
import {Worker} from 'node:worker_threads';
let active=0;
export function runComparison(A,B,{timeout=10000,signal}={}){
 if(signal?.aborted)return Promise.reject(Error('comparison_cancelled'));
 if(active>=2)return Promise.reject(Error('comparison_capacity_limit'));
 active++;
 return new Promise((resolve,reject)=>{
  let done=false;
  let worker;
  try{worker=new Worker(new URL('./comparison-worker.mjs',import.meta.url),{workerData:{A,B},resourceLimits:{maxOldGenerationSizeMb:128}});}catch(error){active--;reject(error);return;}
  const finish=async(error,report)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);try{await worker.terminate();}catch(terminationError){error??=terminationError;}finally{active--;}if(error)reject(error);else resolve(report);};
  const cancel=()=>finish(Error('comparison_cancelled'));
  const timer=setTimeout(()=>finish(Error('comparison_timeout')),timeout);
  signal?.addEventListener('abort',cancel,{once:true});
  worker.once('message',message=>finish(message.error?Error(message.error):null,message.report));
  worker.once('error',error=>finish(error));
  worker.once('exit',code=>{if(!done)finish(Error('comparison_worker_exit:'+code));});
 });
}
