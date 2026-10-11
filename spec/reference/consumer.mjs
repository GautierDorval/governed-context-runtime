// SPDX-License-Identifier: Apache-2.0
// Proposed receiver-local TEST profile. No remote discovery or runtime enforcement.
import {canonical, digest} from './verification.mjs';
import {verifyTestReceipt,snapshotReceiptArtifact} from './signatures.mjs';
import {createPublicKey} from 'node:crypto';
const exact = (o, fields) => o && typeof o === 'object' && !Array.isArray(o)
  && Object.keys(o).sort().join(',') === fields.split(',').sort().join(',');
const strings = a => Array.isArray(a) && a.every(s => typeof s === 'string' && s.length > 0) && new Set(a).size === a.length;
export const CONSUMER_PROFILE = 'runtime-local-consumer/0.1.0-proposed';
export async function validateConsumerPolicy(p) {
  try {
    if (!exact(p,'schema,format,testOnly,expectedRoot,now,minimumSequence,maxAgeSeconds,clockSkewSeconds,keys,allowedKids,purposes')
      || p.schema !== CONSUMER_PROFILE || p.format !== 'detached-jws-ed25519-test-v1' || p.testOnly !== true
      || !/^sha-256:[a-f0-9]{64}$/.test(p.expectedRoot)
      || !['now','minimumSequence','maxAgeSeconds','clockSkewSeconds'].every(k => Number.isSafeInteger(p[k]) && p[k] >= 0)
      || p.minimumSequence < 1 || p.maxAgeSeconds < 1 || !Array.isArray(p.keys) || !p.keys.length
      || !strings(p.allowedKids) || !strings(p.purposes) || p.purposes.some(s => s !== 'inspect-context')) return false;
    const ids = [];
    const publicKeys = [];
    for (const k of p.keys) {
      if (!exact(k,'jwk,jwkDigest,status,notBefore,notAfter') || !exact(k.jwk,'kty,crv,x,kid,alg,use')
        || k.jwk.kty !== 'OKP' || k.jwk.crv !== 'Ed25519' || k.jwk.alg !== 'Ed25519' || k.jwk.use !== 'sig'
        || typeof k.jwk.kid !== 'string' || !k.jwk.kid || !/^[A-Za-z0-9_-]{43}$/.test(k.jwk.x)
        || Buffer.from(k.jwk.x,'base64url').toString('base64url') !== k.jwk.x
        || !['active','retired','revoked'].includes(k.status)
        || !Number.isSafeInteger(k.notBefore) || !Number.isSafeInteger(k.notAfter) || k.notAfter < k.notBefore
        || k.jwkDigest !== await digest(canonical(k.jwk))) return false;
      createPublicKey({key:k.jwk,format:'jwk'});
      ids.push(k.jwk.kid); publicKeys.push(k.jwk.x);
    }
    return strings(ids) && strings(publicKeys) && p.allowedKids.every(id => ids.includes(id));
  } catch { return false; }
}
export async function decideConsumption(policy, artifact, {purpose='inspect-context'}={}) {
  // Snapshot local configuration before any asynchronous validation.
  try { policy = structuredClone(policy); } catch { policy = null; }
  // No artifact getter, parse, or classification before a complete local policy is valid.
  if (!await validateConsumerPolicy(policy)) return {profile:'REJECTED',artifactEvaluated:false,decision:null,stage:'POLICY',reason:'INVALID_LOCAL_POLICY'};
  const base = {profile:'ACCEPTED',artifactEvaluated:true,testOnly:true,productionSuitable:false,
    establishesTruth:false,establishesExecutionAuthority:false};
  let bindings={};
  try {
    artifact=snapshotReceiptArtifact(artifact);
    // Set-like policy arrays are sorted so equivalent key order has one identity.
    const normalized={...policy,keys:policy.keys.toSorted((a,b)=>a.jwk.kid<b.jwk.kid?-1:a.jwk.kid>b.jwk.kid?1:0),allowedKids:policy.allowedKids.toSorted(),purposes:policy.purposes.toSorted()};
    bindings={policyDigest:await digest(canonical(normalized)),artifactDigest:await digest(canonical(artifact)),purpose};
    // Technical receipt validation reuses the established JWS implementation.
    // Known keys are all presented here: disposition/permission is evaluated afterwards.
    const keys = policy.keys.map(k => ({kid:k.jwk.kid,jwkDigest:k.jwkDigest,status:'active',notBefore:k.notBefore,notAfter:k.notAfter}));
    const technical = await verifyTestReceipt(artifact,{keys:policy.keys.map(k=>k.jwk)},
      {...policy,keys},{expectedRoot:policy.expectedRoot,now:policy.now});
    bindings.kid=technical.kid;
    const key = policy.keys.find(k => k.jwk.kid === technical.kid);
    if (key.status !== 'active') return {...base,...bindings,signatureValid:true,decision:'REFUSED',stage:'LOCAL_DISPOSITION',reason:'KEY_NOT_ACTIVE'};
    if (!policy.allowedKids.includes(technical.kid) || !policy.purposes.includes(purpose))
      return {...base,...bindings,signatureValid:true,decision:'REFUSED',stage:'LOCAL_PERMISSION',reason:'LOCAL_USE_NOT_ALLOWED'};
    return {...base,...bindings,...technical,decision:'ACCEPTED_FOR_LOCAL_USE',stage:'LOCAL_PERMISSION',reason:'EXACT_LOCAL_RULE'};
  } catch (error) {
    return {...base,...bindings,decision:'REFUSED',stage:'TECHNICAL_VERIFICATION',reason:error.name === 'VerificationError' ? error.message : 'INVALID_ARTIFACT'};
  }
}
