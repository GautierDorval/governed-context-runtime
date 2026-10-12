// SPDX-License-Identifier: Apache-2.0
// JOSE alg Ed25519 (RFC 9864); crypto is exclusively Node/OpenSSL, not custom.
import { createPublicKey, sign, verify } from 'node:crypto';
import { canonical, strictParse, digest, fail } from './verification.mjs';
export const RECEIPT_TYPE = 'application/vnd.gautierdorval.runtime-test-publication+json';
const keys = value => Object.keys(value).sort().join(',');
const from64 = value => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) fail('invalid_base64url');
  const result = Buffer.from(value,'base64url');
  if (result.toString('base64url') !== value) fail('invalid_base64url');
  return result;
};
export function signTestReceipt(receipt, privateKey, kid, {testOnly=false}={}) {
  if (!testOnly || receipt.testOnly!==true || receipt.origin!=='urn:gd:test:runtime' || privateKey.asymmetricKeyType!=='ed25519') fail('test_signing_only');
  const protected64=Buffer.from(canonical({alg:'Ed25519',kid,typ:RECEIPT_TYPE})).toString('base64url');
  const payload=canonical(receipt), encoded=Buffer.from(payload).toString('base64url');
  const signature=sign(null,Buffer.from(protected64+'.'+encoded),privateKey).toString('base64url');
  return {payloadBase64:Buffer.from(payload).toString('base64'),detachedJws:protected64+'..'+signature};
}
export function snapshotReceiptArtifact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('signature_required');
  if (keys(input)!=='detachedJws,payloadBase64') fail('signature_required');
  // Read external accessors once; all later stages share these primitive values.
  const {payloadBase64,detachedJws}=input;
  if (typeof payloadBase64!=='string' || typeof detachedJws!=='string' || !detachedJws) fail('signature_required');
  return Object.freeze({payloadBase64,detachedJws});
}
export async function verifyTestReceipt(artifact, jwks, policy, {expectedRoot,now,mode='current'}={}) {
  if (!policy || !Array.isArray(policy.keys) || !policy.keys.length
    || !['minimumSequence','maxAgeSeconds','clockSkewSeconds'].every(key => Number.isSafeInteger(policy[key]) && policy[key]>=0)
    || policy.minimumSequence<1 || policy.maxAgeSeconds<1
    || new Set(policy.keys.map(key=>key.kid)).size!==policy.keys.length
    || policy.keys.some(key=>typeof key.kid!=='string' || !key.kid || !/^sha-256:[a-f0-9]{64}$/.test(key.jwkDigest)
      || !['active','retired','revoked'].includes(key.status) || !Number.isSafeInteger(key.notBefore) || !Number.isSafeInteger(key.notAfter) || key.notAfter<key.notBefore)
    || !jwks || !Array.isArray(jwks.keys)) fail('verifier_policy_missing');
  artifact=snapshotReceiptArtifact(artifact);
  const parts=artifact.detachedJws.split('.');
  if(parts.length!==3 || parts[1]!=='' || !parts[2]) fail('invalid_detached_jws');
  const header=strictParse(from64(parts[0]));
  // Compare media types per RFC 7515 section 4.1.9; signature input stays untouched.
  const mediaType = typeof header.typ === 'string' ? (header.typ.includes('/') ? header.typ : 'application/' + header.typ).toLowerCase() : '';
  if(keys(header)!=='alg,kid,typ' || header.alg!=='Ed25519' || mediaType!==RECEIPT_TYPE) fail('protected_header_policy');
  if(typeof header.kid!=='string') fail('unknown_kid');
  const candidates=jwks.keys.filter(key=>key.kid===header.kid);
  if(candidates.length!==1) fail('unknown_or_duplicate_kid');
  const jwk=candidates[0],rule=policy.keys.find(key=>key.kid===header.kid);
  if(!rule || jwk.kty!=='OKP' || jwk.crv!=='Ed25519' || jwk.alg!=='Ed25519' || jwk.use!=='sig' || 'd' in jwk || rule.jwkDigest!==await digest(canonical(jwk))) fail('untrusted_key');
  if(rule.status==='revoked') fail('key_revoked');
  const payload=Buffer.from(artifact.payloadBase64,'base64');
  if(payload.toString('base64')!==artifact.payloadBase64) fail('invalid_payload_encoding');
  const signature=from64(parts[2]);
  if(signature.length!==64 || !verify(null,Buffer.from(parts[0]+'.'+payload.toString('base64url')),createPublicKey({key:jwk,format:'jwk'}),signature)) fail('invalid_signature');
  const receipt=strictParse(payload);
  if(keys(receipt)!=='corpusRootDigest,expiresAt,interfaceVersion,issuedAt,origin,profile,schemaVersion,sequence,snapshotId,testOnly,type'
    || receipt.type!=='RuntimeTestPublicationReceipt' || receipt.schemaVersion!=='0.1.0-proposed' || receipt.profile!=='gd-portable-json-v1'
    || receipt.interfaceVersion!=='0.3.0-proposed' || receipt.testOnly!==true || receipt.origin!=='urn:gd:test:runtime') fail('receipt_context');
  if(receipt.corpusRootDigest!==expectedRoot || receipt.snapshotId!=='governed-context-runtime:'+expectedRoot) fail('receipt_root');
  if(!Number.isSafeInteger(now) || !['current','historical'].includes(mode)) fail('verifier_policy_missing');
  if(!Number.isSafeInteger(receipt.issuedAt) || !Number.isSafeInteger(receipt.expiresAt) || receipt.expiresAt<=receipt.issuedAt
    || receipt.issuedAt<rule.notBefore || receipt.issuedAt>rule.notAfter) fail('key_time_policy');
  if(!Number.isSafeInteger(receipt.sequence) || receipt.sequence<1) fail('sequence_invalid');
  if(mode==='current') {
    if(rule.status!=='active' || receipt.sequence<policy.minimumSequence) fail('replay_or_retired_key');
    if(receipt.issuedAt>now+policy.clockSkewSeconds || receipt.expiresAt<now || now-receipt.issuedAt>policy.maxAgeSeconds) fail('freshness_policy');
  }
  return {kid:header.kid,artifactDigest:await digest(canonical(artifact)),signatureValid:true,testOnly:true,rootBound:true,mode,currentStatusVerified:false,
    trust:'out-of-band test key policy',limitation:'Offline trust information cannot establish later compromise, latest publication, authority or truth.'};
}
