// SPDX-License-Identifier: Apache-2.0
// Complete fictional offline exercise. Test trust material is educational only.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {strictParse,verifySnapshot,fail} from '../reference/verification.mjs';
import {decideConsumption} from '../reference/consumer.mjs';
export async function loadDemo() {
  return strictParse(await readFile(new URL('./synthetic/bundle.json',import.meta.url)));
}
export async function verifyDemo(input, localPolicy) {
  // Take a stable view before either async verification stage. Trust is supplied
  // separately by the caller, never selected from untrusted snapshot metadata.
  const bundle=structuredClone(input), policy=structuredClone(localPolicy);
  if (bundle.fictional!==true || bundle.schema!=='runtime-fictional-demo/1') fail('fictional_context_required');
  if (bundle.snapshot.corpusRootDigest!==policy.expectedRoot) fail('unexpected_corpus_root');
  const decision=await decideConsumption(policy,bundle.receipt);
  if (decision.decision!=='ACCEPTED_FOR_LOCAL_USE' || decision.mode!=='current') fail('receipt_refused:'+decision.reason);
  const checks=await verifySnapshot(bundle.snapshot,uri=>{
    if (!Object.hasOwn(bundle.archives,uri)) fail('missing_demo_archive');
    const text=bundle.archives[uri],raw=Buffer.from(text,'base64');
    if (raw.toString('base64')!==text) fail('invalid_demo_archive');
    return raw;
  },bundle.expectedIntents);
  return {status:'VERIFIED_FICTIONAL_CONTEXT',testOnly:true,productionSuitable:false,checks:checks.length,root:policy.expectedRoot,decision:decision.decision,mode:decision.mode};
}
export async function runDemo() {
  const fixture=await loadDemo(), localPolicy=structuredClone(fixture.policy);
  // Fixture policy and fixed clock are deliberately public. They are not an
  // independently obtained production trust anchor or a statement of freshness.
  const result=await verifyDemo(fixture,localPolicy);
  console.log('PASS: fictional receipt, pinned snapshot and complete archives');
  const tampered=structuredClone(fixture),uri=Object.keys(tampered.archives)[0];
  tampered.archives[uri]=Buffer.from('altered fictional bytes').toString('base64');
  await assert.rejects(()=>verifyDemo(tampered,localPolicy),/archive-envelope/);
  console.log('PASS: altered archive rejected as expected');
  const wrong=structuredClone(localPolicy);wrong.expectedRoot='sha-256:'+'0'.repeat(64);
  await assert.rejects(()=>verifyDemo(fixture,wrong),/unexpected_corpus_root/);
  console.log('PASS: unpinned root rejected as expected');
  const expired=structuredClone(localPolicy);expired.now+=7200;
  await assert.rejects(()=>verifyDemo(fixture,expired),/freshness_policy/);
  console.log('PASS: expired receipt refused for current use');
  console.log(JSON.stringify(result));return result;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await runDemo();
