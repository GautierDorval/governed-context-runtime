// SPDX-License-Identifier: Apache-2.0
// Finite offline example: one full verification, exact selection, private archive bytes.
import {strictParse, canonical, verifySnapshot, select, unitDigestCoverage, fail} from '../reference/verification.mjs';
import {decideConsumption} from '../reference/consumer.mjs';

const copyBytes = value => {
  if (value instanceof ArrayBuffer) return new Uint8Array(value).slice();
  if (value instanceof Uint8Array) return new Uint8Array(value);
  fail('bytes_required');
};

export async function inspectVerifiedPack({snapshotBytes,getArchive,expectedRoot,intentToken,lang,version,expectedIntents}) {
  if (typeof expectedRoot !== 'string' || !/^sha-256:[a-f0-9]{64}$/.test(expectedRoot) || expectedRoot.length !== 72) fail('pinned_root_required');
  const snapshot = strictParse(copyBytes(snapshotBytes));
  const catalog = expectedIntents === undefined ? undefined : structuredClone(expectedIntents);
  if (snapshot.corpusRootDigest !== expectedRoot) fail('unexpected_corpus_root');
  if (typeof intentToken !== 'string' || !intentToken || typeof lang !== 'string' || typeof version !== 'string' || !version) fail('exact_selection_required');
  if (typeof getArchive !== 'function') fail('archive_reader_required');
  const archives = new Map();
  const checks = await verifySnapshot(snapshot, async uri => {
    const bytes = copyBytes(await getArchive(uri));
    archives.set(uri, bytes);
    return bytes;
  }, catalog);
  const matches = snapshot.inventory.packs.filter(p => p.intentToken === intentToken && p.lang === lang && p.version === version);
  if (matches.length !== 1) fail('exact_pack_not_found');
  const entry = matches[0];
  const source = path => {
    const item = snapshot.inventory.items.find(i => i.sourcePath === path);
    if (!item || !archives.has(item.uri)) fail('source_missing');
    return {item, bytes:Buffer.from(strictParse(archives.get(item.uri)).contentBase64,'base64')};
  };
  const document = path => strictParse(source(path).bytes);
  const pack = document(entry.payloadSourcePath), manifest = document(entry.manifestSourcePath);
  const recipes = document('spec/governed-context-runtime/attestation-recipes.json');
  const units = entry.unitIds.map(id => {
    const unit = snapshot.inventory.units.find(u => u.unitId === id);
    if (!unit) fail('indexed_unit_reference');
    const recipe = Object.hasOwn(recipes.profiles ?? {},unit.canonicalization) ? recipes.profiles[unit.canonicalization] : undefined;
    const covered = unitDigestCoverage(unit,recipe);
    return {unit,selectedValue:select(strictParse(source(unit.sourcePath).bytes,{historical:true}),unit.selector),
      legacyDigest:{scope:unit.digestScope,profile:unit.canonicalization,recordFieldsCovered:covered,recordFieldsOutsideDigest:Object.keys(unit).filter(k=>!covered.includes(k))}};
  });
  const paths = new Set([...entry.dependencies,...pack.includedArtifacts.map(i=>i.sourcePath),...units.map(u=>u.unit.sourcePath)]);
  for (const field of ['causalContexts','applicabilityChains','weightingRules','answerBoundaries'])
    for (const rule of pack[field]) if (rule.sourceArtifact !== undefined) paths.add('public'+rule.sourceArtifact);
  const sources = [...paths].map(sourcePath => {
    const {item,bytes} = source(sourcePath);
    return {sourcePath,repositoryDigest:item.repositoryDigest,contentBase64:bytes.toString('base64')};
  });
  return {pack,manifest,units,sources,verification:{corpusRootDigest:expectedRoot,snapshotId:snapshot.snapshotId,
    snapshotChecks:checks.length,selection:{intentToken,lang,version,packId:pack.packId},
    snapshotMembership:'verified-complete-records',independentlySuppliedCatalog:catalog!==undefined,
    integrityOnly:true,signatureTrust:'not-established',usePermission:'not-evaluated',modelUseObserved:false}};
}

// Permission is bound to this invocation, never accepted as a reusable decision token.
// The caller supplies a current local policy and the original receipt on EVERY operation.
export async function consumeVerifiedPack(input, consume) {
  const policy = structuredClone(input.policy);
  const snapshotBytes = copyBytes(input.snapshotBytes);
  const expectedIntents = input.expectedIntents === undefined ? undefined : structuredClone(input.expectedIntents);
  const {receipt,getArchive,intentToken,lang,version,purpose='inspect-context'} = input;
  if (typeof consume !== 'function') fail('consumer_required');
  const decision = await decideConsumption(policy,receipt,{purpose});
  if (decision.decision !== 'ACCEPTED_FOR_LOCAL_USE' || decision.mode !== 'current')
    return {status:'REFUSED',stage:decision.stage,reason:decision.reason,decision,delivered:false};
  let result;
  try {
    result = await inspectVerifiedPack({snapshotBytes,getArchive,expectedRoot:policy.expectedRoot,intentToken,lang,version,expectedIntents});
  } catch (error) {
    if (error.name !== 'VerificationError') throw error;
    return {status:'REFUSED',stage:'SNAPSHOT',reason:error.message,decision,delivered:false};
  }
  result.verification.signatureTrust = 'verified-test-receipt';
  result.verification.usePermission = 'inspect-context';
  result.verification.policyDigest = decision.policyDigest;
  result.verification.receiptArtifactDigest = decision.artifactDigest;
  // Callback exceptions remain consumer failures, never integrity refusals.
  const consumption = await consume(result);
  return {status:'ACCEPTED_FOR_LOCAL_USE',decision,delivered:true,result,consumption};
}
