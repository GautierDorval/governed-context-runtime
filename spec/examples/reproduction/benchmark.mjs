// SPDX-License-Identifier: Apache-2.0
// Local monotonic measurements. Optional baseline is an explicitly supplied local export.
import {performance} from 'node:perf_hooks';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {platform,release,arch} from 'node:os';
import {loadDemo,verifyDemo} from '../demo.mjs';
import {canonical,verifySnapshot} from '../../reference/verification.mjs';
import {decideConsumption} from '../../reference/consumer.mjs';
import {consumeVerifiedPack} from '../verified-pack.mjs';
const loadStart=performance.now(),bundle=await loadDemo(),loadMs=performance.now()-loadStart;
const snapshotBytes=canonical(bundle.snapshot),archive=uri=>Buffer.from(bundle.archives[uri],'base64');
const repetitions=40,warmup=5;
async function measure(fn){for(let i=0;i<warmup;i++)await fn();const samples=[];for(let i=0;i<repetitions;i++){const start=performance.now();await fn();samples.push(performance.now()-start);}const sorted=[...samples].sort((a,b)=>a-b);return {unit:'ms',median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1],samples};}
const result={schema:'runtime-local-consumer-cost/1',utc:new Date().toISOString(),environment:{node:process.version,os:platform(),release:release(),arch:arch()},clock:'performance.now monotonic',warmup,repetitions,snapshotBytes:snapshotBytes.length,archives:bundle.snapshot.inventory.items.length,fixtureReadMs:loadMs,
 current:{fullReceiptAndSnapshot:await measure(()=>verifyDemo(bundle,bundle.policy)),snapshotOnly:await measure(()=>verifySnapshot(bundle.snapshot,archive,bundle.expectedIntents)),localDecision:await measure(()=>decideConsumption(bundle.policy,bundle.receipt)),selectedPackWithDecision:await measure(()=>consumeVerifiedPack({policy:bundle.policy,receipt:bundle.receipt,snapshotBytes,getArchive:archive,expectedIntents:bundle.expectedIntents,intentToken:'representation-gap',lang:'en',version:bundle.snapshot.inventory.packs[0].version},()=>({received:true}))),fictionalHandoff:await measure(()=>({received:true}))},
 limits:['Local synthetic bytes only; not hosted latency or model latency.','The new selected-pack path has no prior whole-pack implementation; compare the unchanged fullReceiptAndSnapshot path before/after separately.','Every operation reevaluates local policy; no authorization cache.']};
const args=process.argv.slice(2);
if(args.length){if(args.length!==2||args[0]!=='--baseline')throw Error('usage: benchmark.mjs [--baseline local-export]');const base=resolve(args[1]);const original=await import(pathToFileURL(resolve(base,'spec/examples/demo.mjs')).href);const before=await original.loadDemo();if(Buffer.compare(Buffer.from(canonical(before)),Buffer.from(canonical(bundle))))throw Error('baseline_fixture_differs');result.baseline={fullReceiptAndSnapshot:await measure(()=>original.verifyDemo(before,bundle.policy))};}
console.log(JSON.stringify(result,null,2));
