// SPDX-License-Identifier: Apache-2.0
// Offline only: explicit local snapshot/archive paths and independently supplied roots.
import './data.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {strictParse} from './reference/spec/reference/verification.mjs';
import {admitComparison} from './comparison-admission.mjs';
import {compareAdmitted} from './comparison.mjs';
export async function compareFiles(configPath){
 const config=strictParse(await readFile(configPath)),directory=dirname(resolve(configPath));
 const load=async c=>{
  const snapshotBytes=await readFile(resolve(directory,c.snapshotPath));
  const archives=resolve(directory,c.archivesDirectory);
  const expectedIntents=c.expectedIntentsPath?strictParse(await readFile(resolve(directory,c.expectedIntentsPath))):undefined;
  return admitComparison({...c,expectedIntents,snapshotBytes,getArchive:uri=>{
   if(!/^\/v0\/artifacts\/[a-f0-9]{64}$/.test(uri))throw Error('local_archive_uri_required');
   return readFile(resolve(archives,uri.split('/').at(-1)+'.json'));
  }});
 };
 return compareAdmitted(await load(config.A),await load(config.B));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==4)throw Error('usage: node comparison-cli.mjs <local-pair-config.json> <new-private-report.json>');
 const report=await compareFiles(process.argv[2]);
 await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,operations:report.operations.length,A:report.A.selection,B:report.B.selection,equality:report.equality}));
}
