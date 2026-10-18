// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {loadDemo,verifyDemo} from '../examples/demo.mjs';
import {canonical,digest,strictParse,unitPreimage,artifactPreimage,verifySnapshot} from './verification.mjs';
import {verifyTestReceipt,RECEIPT_TYPE} from './signatures.mjs';
const initial=await loadDemo();
const clone=()=>structuredClone(initial);
async function root(b){b.snapshot.corpusRootDigest=await digest(canonical(b.snapshot.inventory));b.snapshot.snapshotId='governed-context-runtime:'+b.snapshot.corpusRootDigest;}
async function replaceSource(b,path,edit){
 const item=b.snapshot.inventory.items.find(i=>i.sourcePath===path);
 const archive=strictParse(Buffer.from(b.archives[item.uri],'base64'));
 const original=Buffer.from(archive.contentBase64,'base64');
 const value=strictParse(original);edit(value);
 const data=canonical(value);archive.contentBase64=Buffer.from(data).toString('base64');archive.digest=await digest(data);
 const bytes=canonical(archive);delete b.archives[item.uri];
 Object.assign(item,{repositoryDigest:archive.digest,version:archive.digest,byteLength:data.length,digest:await digest(bytes)});
 item.uri='/v0/artifacts/'+item.digest.slice(8);b.archives[item.uri]=Buffer.from(bytes).toString('base64');await root(b);
}
const verify=b=>verifySnapshot(b.snapshot,uri=>Buffer.from(b.archives[uri],'base64'),b.expectedIntents);

test('complete fictional signature and snapshot path',async()=>assert.equal((await verifyDemo(clone(),initial.policy)).status,'VERIFIED_FICTIONAL_CONTEXT'));
for(const [field,value] of Object.entries({digestAlgorithm:'sha-1',canonicalization:'unknown',digestScope:'opaque',kind:'remote',version:'sha-256:'+'0'.repeat(64)}))test('C15 rejects archive inventory '+field+' even under recomputed root',async()=>{const b=clone();b.snapshot.inventory.items[0][field]=value;await root(b);await assert.rejects(()=>verify(b),/item-profile/);});
for(const [field,value] of Object.entries({digestAlgorithm:'sha-1',digestScope:'opaque',encoding:'utf-8',type:'Unknown',schemaVersion:'2'}))test('C15 rejects archived envelope '+field,async()=>{const b=clone(),i=b.snapshot.inventory.items[0],a=strictParse(Buffer.from(b.archives[i.uri],'base64'));a[field]=value;const raw=canonical(a);delete b.archives[i.uri];i.digest=await digest(raw);i.uri='/v0/artifacts/'+i.digest.slice(8);b.archives[i.uri]=Buffer.from(raw).toString('base64');await root(b);await assert.rejects(()=>verify(b),/archive-profile/);});
for(const field of ['json','text'])test('C15 closes registry profile '+field,async()=>{const b=clone();await replaceSource(b,'public/content-digests.json',d=>d.canonicalization[field]='unknown');await assert.rejects(()=>verify(b),/artifact-registry-profile/);});
test('C15 validates complete artifact algorithm',async()=>{const b=clone();await replaceSource(b,'public/content-digests.json',d=>d.artifacts[0].digestAlgorithm='sha-1');await assert.rejects(()=>verify(b),/artifact-algorithm/);});
for(const ids of [['missing'],[],['fictional-autonomy-boundary','fictional-autonomy-boundary']])test('C15 index unit references '+JSON.stringify(ids),async()=>{const b=clone();b.snapshot.inventory.packs[0].unitIds=ids;await root(b);await assert.rejects(()=>verify(b),/indexed-units/);});
for(const [field,value] of [['digestAlgorithm','sha-1'],['selectedValueType','str'],['canonicalization','unknown']])test('C15 checks full unit '+field,async()=>{const b=clone();b.snapshot.inventory.units[0][field]=value;await replaceSource(b,'public/attested-interpretive-units.json',d=>d.units[0][field]=value);await assert.rejects(()=>verify(b),/unit-algorithm|unit-selected-type|unit_recipe_mismatch/);});
test('C04 historical v0 is not source-value binding; fixed trusted root rejects altered source',async()=>{
 const unit=initial.snapshot.inventory.units[0],a=Buffer.from('{"allowsAutonomy":false}'),b=Buffer.from('{"allowsAutonomy":true}');
 assert.deepEqual(unitPreimage(unit,a),unitPreimage(unit,b));
 const changed=clone();await replaceSource(changed,'public/fictional-policy.json',d=>d.allowsAutonomy=true);
 await assert.rejects(()=>verifyDemo(changed,initial.policy),/unexpected_corpus_root/);
 // This is rejection of a new root, not evidence of a signature bypass.
});
test('C04 selector, source path, text and context are part of v0 envelope',()=>{const u=initial.snapshot.inventory.units[0],source=Buffer.from('{"allowsAutonomy":false,"other":false}'),pre=unitPreimage(u,source);for(const [field,value] of [['selector','$.other'],['sourcePath','public/other.json'],['claimClass','different'],['authorityScope','different'],['canonicalText','Different fictional statement.']])assert.notDeepEqual(unitPreimage({...u,[field]:value},source),pre);});
test('C05 transformations require whole snapshot, not isolated v0 digest',async()=>{const b=clone(),u=b.snapshot.inventory.units[0],source=Buffer.from('{"allowsAutonomy":false}'),pre=unitPreimage(u,source);u.forbiddenTransformations=[];assert.deepEqual(unitPreimage(u,source),pre);await replaceSource(b,'public/attested-interpretive-units.json',d=>d.units[0].forbiddenTransformations=[]);await verify(b);await assert.rejects(()=>verifyDemo(b,initial.policy),/unexpected_corpus_root/);});
test('C16 parsing of source uses the historical bounded numeric domain',()=>{const u=initial.snapshot.inventory.units[0];assert.doesNotThrow(()=>unitPreimage(u,Buffer.from('{"allowsAutonomy":false,"number":4.6}')));const n={...u,selector:'$.number',digestScope:'selected_unit_only',canonicalization:'deterministic-json-sort-keys-v0'};assert.equal(Buffer.from(unitPreimage(n,Buffer.from('{"number":4.6}'))).toString(),'4.6');for(const n of ['1.0','1e0','0.00001','-0','1e99'])assert.throws(()=>unitPreimage(u,Buffer.from('{"allowsAutonomy":false,"number":'+n+'}')));});
test('C16 uppercase JSON cannot silently select text recipe',()=>{assert.throws(()=>artifactPreimage('sample.JSON',Buffer.from('{"n":4.6}')),/ambiguous_artifact_extension/);assert.throws(()=>artifactPreimage('sample.json',Buffer.from('{}'),'utf8-nfc-lf-trimmed-v0'),/artifact_profile/);});
test('C08 historical inspection cannot become current consumer permission',async()=>{const b=clone(),p=b.policy,k=p.keys[0],rule={kid:k.jwk.kid,jwkDigest:k.jwkDigest,status:'retired',notBefore:k.notBefore,notAfter:k.notAfter};const historical=await verifyTestReceipt(b.receipt,{keys:[k.jwk]},{...p,minimumSequence:100,keys:[rule]},{expectedRoot:p.expectedRoot,now:p.now+7200,mode:'historical'});assert.equal(historical.mode,'historical');assert.equal(historical.currentStatusVerified,false);const expired={...p,now:p.now+7200};await assert.rejects(()=>verifyDemo(b,expired),/freshness_policy/);b.receipt=historical;await assert.rejects(()=>verifyDemo(b,p),/signature_required/);});
test('C17 compact and case-insensitive media type comparison preserves signed bytes',async()=>{const b=clone(),{privateKey,publicKey}=generateKeyPairSync('ed25519'),jwk={...publicKey.export({format:'jwk'}),kid:'new-fictional-key',alg:'Ed25519',use:'sig'},p=b.policy,old=p.keys[0],rule={kid:jwk.kid,jwkDigest:await digest(canonical(jwk)),status:'active',notBefore:old.notBefore,notAfter:old.notAfter};const payload=Buffer.from(b.receipt.payloadBase64,'base64');for(const typ of [RECEIPT_TYPE,RECEIPT_TYPE.slice(12),RECEIPT_TYPE.toUpperCase()]){const header=Buffer.from(canonical({alg:'Ed25519',kid:jwk.kid,typ})).toString('base64url'),signature=sign(null,Buffer.from(header+'.'+payload.toString('base64url')),privateKey).toString('base64url'),a={payloadBase64:b.receipt.payloadBase64,detachedJws:header+'..'+signature};assert.equal((await verifyTestReceipt(a,{keys:[jwk]},{...p,keys:[rule]},{expectedRoot:p.expectedRoot,now:p.now})).signatureValid,true);const other=Buffer.from(canonical({alg:'Ed25519',kid:jwk.kid,typ:typ===RECEIPT_TYPE?RECEIPT_TYPE.slice(12):RECEIPT_TYPE})).toString('base64url');await assert.rejects(()=>verifyTestReceipt({...a,detachedJws:other+'..'+signature},{keys:[jwk]},{...p,keys:[rule]},{expectedRoot:p.expectedRoot,now:p.now}),/invalid_signature/);}});
test('C20 jwkDigest binds configuration, not only mathematical key',async()=>{const k=initial.policy.keys[0];assert.notEqual(await digest(canonical({...k.jwk,kid:'other-name'})),k.jwkDigest);});

// A current/historical matrix keeps the same signed receipt and changes only local trust or time.
for (const mode of ['current','historical']) {
 for (const status of ['active','retired','revoked']) {
  test('direct verifier '+mode+' inspection with '+status+' key',async()=>{
   const b=clone(),p=b.policy,k=p.keys[0];
   const rule={kid:k.jwk.kid,jwkDigest:k.jwkDigest,status,notBefore:k.notBefore,notAfter:k.notAfter};
   const inspect=()=>verifyTestReceipt(b.receipt,{keys:[k.jwk]},{...p,keys:[rule]},{expectedRoot:p.expectedRoot,now:p.now,mode});
   if (status==='revoked') return assert.rejects(inspect,{name:'VerificationError',message:'key_revoked'});
   if (status==='retired' && mode==='current') return assert.rejects(inspect,{name:'VerificationError',message:'replay_or_retired_key'});
   const result=await inspect();
   assert.equal(result.mode,mode);assert.equal(result.signatureValid,true);assert.equal(result.rootBound,true);
   assert.equal(result.currentStatusVerified,false);
  });
 }
 test('direct verifier '+mode+' inspection of an expired receipt',async()=>{
  const b=clone(),p=b.policy,k=p.keys[0];
  const rule={kid:k.jwk.kid,jwkDigest:k.jwkDigest,status:'active',notBefore:k.notBefore,notAfter:k.notAfter};
  const now=JSON.parse(Buffer.from(b.receipt.payloadBase64,'base64').toString()).expiresAt+1;
  const inspect=()=>verifyTestReceipt(b.receipt,{keys:[k.jwk]},{...p,maxAgeSeconds:Number.MAX_SAFE_INTEGER,keys:[rule]},{expectedRoot:p.expectedRoot,now,mode});
  if (mode==='current') return assert.rejects(inspect,{name:'VerificationError',message:'freshness_policy'});
  const result=await inspect();assert.equal(result.mode,'historical');assert.equal(result.signatureValid,true);
  assert.equal(result.currentStatusVerified,false);
 });
 test('direct verifier '+mode+' accepts valid lower policy bounds',async()=>{
  const b=clone(),p=b.policy,k=p.keys[0];
  const rule={kid:k.jwk.kid,jwkDigest:k.jwkDigest,status:'active',notBefore:k.notBefore,notAfter:k.notAfter};
  const now=JSON.parse(Buffer.from(b.receipt.payloadBase64,'base64').toString()).issuedAt;
  const result=await verifyTestReceipt(b.receipt,{keys:[k.jwk]},{...p,minimumSequence:1,maxAgeSeconds:1,clockSkewSeconds:0,keys:[rule]},{expectedRoot:p.expectedRoot,now,mode});
  assert.equal(result.signatureValid,true);assert.equal(result.mode,mode);assert.equal(result.currentStatusVerified,false);
 });
 for (const [name,now] of [['missing',undefined],['fractional',0.5],['unsafe-integer',Number.MAX_SAFE_INTEGER+1],['non-finite',Infinity],['non-numeric','110']]) {
  test('direct verifier '+mode+' rejects invalid now: '+name,async()=>{
   const b=clone(),p=b.policy,k=p.keys[0];
   const rule={kid:k.jwk.kid,jwkDigest:k.jwkDigest,status:'active',notBefore:k.notBefore,notAfter:k.notAfter};
   const options={expectedRoot:p.expectedRoot,mode};if (name!=='missing') options.now=now;
   await assert.rejects(
    ()=>verifyTestReceipt(b.receipt,{keys:[k.jwk]},{...p,keys:[rule]},options),
    {name:'VerificationError',message:'verifier_policy_missing'}
   );
  });
 }
 for (const field of ['minimumSequence','maxAgeSeconds','clockSkewSeconds']) {
  for (const invalid of ['missing','fractional','negative','unsafe-integer','minimum-boundary']) {
   if (field==='clockSkewSeconds' && invalid==='minimum-boundary') continue;
   test('direct verifier '+mode+' requires valid '+field+': '+invalid,async()=>{
    const b=clone(),p=b.policy,k=p.keys[0];
    const rule={kid:k.jwk.kid,jwkDigest:k.jwkDigest,status:'active',notBefore:k.notBefore,notAfter:k.notAfter};
    const verifierPolicy={...p,keys:[rule]};
    if (invalid==='missing') delete verifierPolicy[field];
    else verifierPolicy[field]=invalid==='fractional'?0.5:invalid==='negative'?-1:invalid==='unsafe-integer'?Number.MAX_SAFE_INTEGER+1:0;
    await assert.rejects(
     ()=>verifyTestReceipt(b.receipt,{keys:[k.jwk]},verifierPolicy,{expectedRoot:p.expectedRoot,now:p.now,mode}),
     {name:'VerificationError',message:'verifier_policy_missing'}
    );
   });
  }
 }
}
