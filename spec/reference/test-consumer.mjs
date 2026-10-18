// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {canonical,digest} from './verification.mjs';
import {signTestReceipt} from './signatures.mjs';
import {CONSUMER_PROFILE,decideConsumption} from './consumer.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const jwk={...publicKey.export({format:'jwk'}),kid:'neutral-local-test',alg:'Ed25519',use:'sig'};
const root='sha-256:'+'a'.repeat(64);
const receipt={type:'RuntimeTestPublicationReceipt',schemaVersion:'0.1.0-proposed',profile:'gd-portable-json-v1',interfaceVersion:'0.3.0-proposed',testOnly:true,origin:'urn:gd:test:runtime',corpusRootDigest:root,snapshotId:'governed-context-runtime:'+root,sequence:1,issuedAt:100,expiresAt:200};
const artifact=signTestReceipt(receipt,privateKey,jwk.kid,{testOnly:true});
const policy={schema:CONSUMER_PROFILE,format:'detached-jws-ed25519-test-v1',testOnly:true,expectedRoot:root,now:110,minimumSequence:1,maxAgeSeconds:100,clockSkewSeconds:0,keys:[{jwk,jwkDigest:await digest(canonical(jwk)),status:'active',notBefore:0,notAfter:200}],allowedKids:[jwk.kid],purposes:['inspect-context']};
const clone=o=>structuredClone(o);
test('neutral JWS: technical verification does not claim external authority',async()=>{
 const result=await decideConsumption(policy,artifact);assert.equal(result.decision,'ACCEPTED_FOR_LOCAL_USE');assert.equal(result.establishesTruth,false);assert.equal(result.currentStatusVerified,false);
});
for (const [name,mutate] of Object.entries({missing:p=>null,format:p=>({...p,format:'DSSE'}),duplicate:p=>({...p,keys:[...p.keys,...p.keys]}),unknown:p=>({...p,extra:true}),clock:p=>({...p,now:NaN}),digest:p=>{p.keys[0].jwkDigest=root;return p},unresolved:p=>({...p,allowedKids:['absent']}),permission:p=>({...p,purposes:['execute']}),privateKey:p=>{p.keys[0].jwk.d='x';return p}})) {
 test('invalid policy precedes all artifact access: '+name,async()=>{let touched=false;const a=new Proxy({}, {get(){touched=true;throw Error('must not evaluate')}});const result=await decideConsumption(mutate(clone(policy)),a);assert.equal(result.artifactEvaluated,false);assert.equal(result.decision,null);assert.equal(touched,false)});
}
test('cryptographically valid but locally unauthorized is explicit',async()=>{const p=clone(policy);p.allowedKids=[];const r=await decideConsumption(p,artifact);assert.equal(r.signatureValid,true);assert.equal(r.reason,'LOCAL_USE_NOT_ALLOWED')});
for (const status of ['retired','revoked']) {
 for (const allowed of [true,false]) {
  test('valid signature with '+status+' key, allowed kid: '+allowed,async()=>{
   const p=clone(policy);p.keys[0].status=status;p.allowedKids=allowed?[jwk.kid]:[];
   const result=await decideConsumption(p,artifact);
   assert.equal(result.decision,'REFUSED');assert.equal(result.reason,'KEY_NOT_ACTIVE');
   assert.equal(result.stage,'LOCAL_DISPOSITION');assert.equal(result.signatureValid,true);
  });
 }
 test('expired receipt with '+status+' key is refused before local disposition',async()=>{
  const p=clone(policy);p.keys[0].status=status;p.allowedKids=[];p.now=receipt.expiresAt+1;p.maxAgeSeconds=1000;
  const result=await decideConsumption(p,artifact);
  assert.equal(result.decision,'REFUSED');assert.equal(result.reason,'freshness_policy');
  assert.equal(result.stage,'TECHNICAL_VERIFICATION');assert.notEqual(result.signatureValid,true);
 });
}
test('consumer historical option cannot bypass current freshness checks',async()=>{
 const p=clone(policy);p.now=receipt.expiresAt+1;p.maxAgeSeconds=1000;
 const current=await decideConsumption(p,artifact);
 const historicalOption=await decideConsumption(p,artifact,{mode:'historical'});
 assert.equal(current.decision,'REFUSED');assert.equal(current.reason,'freshness_policy');
 assert.equal(current.stage,'TECHNICAL_VERIFICATION');assert.deepEqual(historicalOption,current);
});
test('double fault: bad signature precedes disposition and permission',async()=>{
 const p=clone(policy);p.allowedKids=[];p.keys[0].status='revoked';
 const a=clone(artifact),parts=a.detachedJws.split('.'),sig=Buffer.from(parts[2],'base64url');
 sig[0]^=1;parts[2]=sig.toString('base64url');a.detachedJws=parts.join('.');
 const result=await decideConsumption(p,a);
 assert.equal(result.decision,'REFUSED');assert.equal(result.reason,'invalid_signature');
 assert.equal(result.stage,'TECHNICAL_VERIFICATION');assert.notEqual(result.signatureValid,true);
});
test('double fault: unknown key precedes invalid signature',async()=>{const a=clone(artifact);const parts=a.detachedJws.split('.');parts[0]=Buffer.from(canonical({alg:'Ed25519',kid:'unknown',typ:'application/vnd.gautierdorval.runtime-test-publication+json'})).toString('base64url');a.detachedJws=parts.join('.');assert.equal((await decideConsumption(policy,a)).reason,'unknown_or_duplicate_kid')});
test('different signed root rejected before local permission',async()=>{const a=signTestReceipt({...receipt,corpusRootDigest:'sha-256:'+'b'.repeat(64)},privateKey,jwk.kid,{testOnly:true});assert.equal((await decideConsumption(policy,a)).reason,'receipt_root')});
test('DSSE cannot enter the JWS path',async()=>{assert.equal((await decideConsumption(policy,{payload:'e30=',signatures:[]})).reason,'signature_required')});
test('disallowed algorithm cannot be accepted',async()=>{const a=clone(artifact);const parts=a.detachedJws.split('.');const h=JSON.parse(Buffer.from(parts[0],'base64url'));h.alg='none';parts[0]=Buffer.from(canonical(h)).toString('base64url');a.detachedJws=parts.join('.');assert.equal((await decideConsumption(policy,a)).reason,'protected_header_policy')});
test('policy key order cannot alter a result',async()=>{const second=generateKeyPairSync('ed25519').publicKey.export({format:'jwk'});Object.assign(second,{kid:'second',alg:'Ed25519',use:'sig'});const p=clone(policy);p.keys.push({jwk:second,jwkDigest:await digest(canonical(second)),status:'retired',notBefore:0,notAfter:200});assert.deepEqual(await decideConsumption(p,artifact),await decideConsumption({...p,keys:p.keys.toReversed()},artifact))});


test('one artifact snapshot binds signer, payload and local decision despite accessors',async()=>{
 const other=generateKeyPairSync('ed25519');const j={...other.publicKey.export({format:'jwk'}),kid:'allowed-second',alg:'Ed25519',use:'sig'};
 const p=clone(policy);p.allowedKids=[j.kid];p.keys.push({jwk:j,jwkDigest:await digest(canonical(j)),status:'active',notBefore:0,notAfter:200});
 const b=signTestReceipt(receipt,other.privateKey,j.kid,{testOnly:true});let reads=0;
 const a={payloadBase64:artifact.payloadBase64,get detachedJws(){return ++reads<=2?artifact.detachedJws:b.detachedJws}};
 const result=await decideConsumption(p,a);
 assert.equal(reads,1);assert.equal(result.reason,'LOCAL_USE_NOT_ALLOWED');assert.equal(result.kid,jwk.kid);
 assert.equal(result.artifactDigest,await digest(canonical(artifact)));assert.match(result.policyDigest,/^sha-256:[a-f0-9]{64}$/);
 const changed=clone(p);changed.allowedKids.push(jwk.kid);
 assert.notEqual((await decideConsumption(changed,artifact)).policyDigest,result.policyDigest);
});
test('mixed DSSE and JWS envelope and non-string inputs are rejected',async()=>{
 for(const a of [{...artifact,payloadType:'application/vnd.in-toto+json',signatures:[]},{...artifact,detachedJws:[]},{...artifact,payloadBase64:{}}])
  assert.equal((await decideConsumption(policy,a)).reason,'signature_required');
});
