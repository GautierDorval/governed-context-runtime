// SPDX-License-Identifier: Apache-2.0
// Offline kit entry point. All reads are local; no discovery, fetch or implicit policy.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,sep} from 'node:path';
import {loadDemo} from '../demo.mjs';
import {canonical,fail,unitPreimage,digest} from '../../reference/verification.mjs';
import {consumeVerifiedPack} from '../verified-pack.mjs';
const here=new URL('./',import.meta.url), root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const sha=raw=>createHash('sha256').update(raw).digest('hex');
export async function verifyKit() {
 const raw=await readFile(new URL('manifest.json',here)),manifest=JSON.parse(raw);
 if(manifest.schema!=='runtime-reproduction-kit/1'||!Array.isArray(manifest.files)||!manifest.files.length)fail('kit_manifest');
 const seen=new Set();
 for(const item of manifest.files){
  if(typeof item.path!=='string'||item.path.includes('\\')||item.path.split('/').some(p=>p==='..'||p==='')||seen.has(item.path))fail('kit_path');
  const target=resolve(root,item.path);if(!target.startsWith(root+sep))fail('kit_path');
  seen.add(item.path);const bytes=await readFile(target);
  if(sha(bytes)!==item.sha256||bytes.length!==item.bytes)fail('kit_file_mismatch:'+item.path);
 }
 return {kitDigest:'sha-256:'+sha(raw),referenceBaseCommit:manifest.referenceBaseCommit};
}
export async function runCase(id,policy,{lang='en',intentToken='representation-gap',version}={}) {
 const bundle=await loadDemo();let calls=0,held,rewritten=false;
 const args={policy:structuredClone(policy),receipt:structuredClone(bundle.receipt),snapshotBytes:canonical(bundle.snapshot),expectedIntents:bundle.expectedIntents,
  intentToken,lang,version:version??bundle.snapshot.inventory.packs[0].version,
  getArchive:uri=>{if(!Object.hasOwn(bundle.archives,uri))fail('missing_archive');return Buffer.from(bundle.archives[uri],'base64');}};
 switch(id){
  case 'nominal-en':break;
  case 'nominal-fr':args.lang='fr';break;
  case 'wrong-root':args.policy.expectedRoot='sha-256:'+'0'.repeat(64);break;
  case 'invalid-signature':{const parts=args.receipt.detachedJws.split('.'),sig=Buffer.from(parts[2],'base64url');sig[0]^=1;parts[2]=sig.toString('base64url');args.receipt.detachedJws=parts.join('.');break;}
  case 'algorithm':{const parts=args.receipt.detachedJws.split('.'),header=JSON.parse(Buffer.from(parts[0],'base64url'));header.alg='none';parts[0]=Buffer.from(JSON.stringify(header)).toString('base64url');args.receipt.detachedJws=parts.join('.');break;}
  case 'missing-archive':args.getArchive=()=>fail('missing_archive');break;
  case 'altered-archive':args.getArchive=()=>Buffer.from('{}');break;
  case 'unknown-intent':args.intentToken='unknown';break;
  case 'wrong-language':args.lang='de';break;
  case 'wrong-version':args.version='999.0.0';break;
  case 'not-permitted':args.policy.allowedKids=[];break;
  case 'wrong-purpose':args.purpose='execute';break;
  case 'expired':args.policy.now+=7200;break;
  case 'revoked':args.policy.keys[0].status='revoked';break;
  case 'captured-archive':args.getArchive=uri=>{if(held){held.fill(0);rewritten=true;}held=Buffer.from(bundle.archives[uri],'base64');return held;};break;
  default:fail('unknown_case');
 }
 const result=await consumeVerifiedPack(args,pack=>{calls++;return {event:'CONTENT_DELIVERED_TO_FICTIONAL_CONSUMER',packId:pack.pack.packId,lang:pack.pack.lang,purpose:'inspect-context'};});
 if(held)held.fill(0);
 return {id,status:result.status,stage:result.stage??result.decision.stage,reason:result.reason??result.decision.reason,delivered:result.delivered,consumerCalls:calls,
  ...(id==='captured-archive'?{callerBufferChanged:rewritten}:{}),decision:result.decision,
  ...(result.delivered?{consumption:result.consumption,content:result.result}:{} )};
}
export async function historicalWitness(policy) {
 const b=await loadDemo(),unit=b.snapshot.inventory.units[0];
 const item=b.snapshot.inventory.items.find(i=>i.sourcePath===unit.sourcePath),archive=JSON.parse(Buffer.from(b.archives[item.uri],'base64'));
 const bytes=Buffer.from(archive.contentBase64,'base64');
 const changed={...unit,selectedValueType:'changed',forbiddenTransformations:[]};
 const isolatedDigestUnchanged=await digest(unitPreimage(unit,bytes))===await digest(unitPreimage(changed,bytes));
 const snapshot=structuredClone(b.snapshot);snapshot.inventory.units[0]=changed;let calls=0;
 const result=await consumeVerifiedPack({policy,receipt:b.receipt,snapshotBytes:canonical(snapshot),expectedIntents:b.expectedIntents,intentToken:'representation-gap',lang:'en',version:b.snapshot.inventory.packs[0].version,getArchive:uri=>Buffer.from(b.archives[uri],'base64')},()=>{calls++;});
 return {id:'historical-v0',isolatedDigestUnchanged,status:result.status,reason:result.reason,consumerCalls:calls,delivered:result.delivered,
  scope:'The isolated digest excludes these fields. The unchanged pinned inventory root rejects their substitution.'};
}
export async function main(argv) {
 const help='Usage: node spec/examples/reproduction/run.mjs --policy <local.json> [--suite | --case <id>] [--lang en|fr] [--intent representation-gap] [--version <exact>]\nReads local files only; writes JSON to stdout, no files. Exit 0: admitted case / suite expectations met; 2: refused single case or usage; 1: unexpected failure. --help needs no policy.';
 if(argv.length===1&&argv[0]==='--help'){console.log(help);return 0;}
 const options={};
 for(let i=0;i<argv.length;i++){
  const key=argv[i];if(!['--policy','--suite','--case','--lang','--intent','--version'].includes(key)||Object.hasOwn(options,key))fail('usage');
  if(key==='--suite')options[key]=true;
  else {if(!argv[i+1]||argv[i+1].startsWith('--'))fail('usage');options[key]=argv[++i];}
 }
 if(!options['--policy']||(options['--suite']&&options['--case']))fail('explicit_policy_required');
 const identity=await verifyKit(),policy=JSON.parse(await readFile(resolve(options['--policy']),'utf8'));
 const selection={lang:options['--lang']??'en',intentToken:options['--intent']??'representation-gap',version:options['--version']};
 const base={schema:'runtime-producer-reproduction/1',...identity,utc:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},externalReproduction:'NOT_RUN',modelExperiments:'NOT_RUN',testOnly:true,productionSuitable:false};
 if(options['--suite']){
  if(options['--lang']||options['--intent']||options['--version'])fail('suite_has_fixed_selections');
  const matrix=JSON.parse(await readFile(new URL('cases.json',here))),results=[];
  for(const row of matrix.cases){const result=await runCase(row.id,policy);const pass=Object.entries(row.expected).every(([k,v])=>result[k]===v)&&result.consumerCalls===(row.expected.delivered?1:0)&&(row.id!=='captured-archive'||result.callerBufferChanged);results.push({...result,expected:row.expected,verdict:pass?'PASS':'FAIL'});}
  const witness=await historicalWitness(policy);witness.verdict=witness.isolatedDigestUnchanged&&witness.status==='REFUSED'&&witness.reason==='corpus-root'&&witness.consumerCalls===0?'PASS':'FAIL';results.push(witness);
  const pass=results.every(r=>r.verdict==='PASS');console.log(JSON.stringify({...base,status:pass?'PRODUCER_REPRODUCED':'FAIL',cases:results},null,2));return pass?0:1;
 }
 const result=await runCase(options['--case']??'nominal-en',policy,selection);
 console.log(JSON.stringify({...base,status:result.delivered?'PRODUCER_REPRODUCED':'REFUSED',case:result},null,2));return result.delivered?0:2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{process.exitCode=await main(process.argv.slice(2));}catch(error){console.error(JSON.stringify({status:error.name==='VerificationError'?'REFUSED':'ERROR',reason:error.message,delivered:false}));process.exitCode=error.name==='VerificationError'?2:1;}
}
