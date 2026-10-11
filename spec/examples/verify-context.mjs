// SPDX-License-Identifier: Apache-2.0
// Offline consumer. Supply a separately pinned root, snapshot, and closed archive directory.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {strictParse,verifySnapshot} from '../reference/verification.mjs';
const [snapshotPath,archiveDirectory,expectedRoot,intent='representation-gap']=process.argv.slice(2);
try{
 if(!/^sha-256:[a-f0-9]{64}$/.test(expectedRoot||''))throw Error('out_of_band_root_required');
 const snapshot=strictParse(await readFile(snapshotPath));
 if(snapshot.corpusRootDigest!==expectedRoot)throw Error('root_not_pinned');
 const checks=await verifySnapshot(snapshot,async uri=>{
  if(!/^\/v0\/artifacts\/[a-f0-9]{64}$/.test(uri))throw Error('archive_path_refused');
  return readFile(resolve(archiveDirectory,uri.split('/').at(-1)+'.json'));
 });
 const packs=snapshot.inventory.packs.filter(p=>p.intentToken===intent);
 if(packs.length!==2)throw Error('intent_not_in_closed_registry');
 console.log(JSON.stringify({status:'VERIFIED_OFFLINE_CONTEXT',corpusRootDigest:expectedRoot,intent,packs:packs.map(p=>({packId:p.packId,lang:p.lang,version:p.version})),checks:checks.length,live:false,modelUseObserved:false},null,2));
}catch(e){console.error(JSON.stringify({status:'REJECTED',reason:e.message}));process.exitCode=2}
