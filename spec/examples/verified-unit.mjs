// SPDX-License-Identifier: Apache-2.0
// Consumer-side integration example. No network, signature or permission decision.
import {strictParse,canonical,verifySnapshot,select,fail} from '../reference/verification.mjs';

export async function inspectVerifiedUnit({snapshotBytes,unitBytes,expectedRoot,getArchive,expectedIntents}) {
  if (!/^sha-256:[a-f0-9]{64}$/.test(expectedRoot ?? '')) fail('pinned_root_required');
  // Copy caller inputs before asynchronous work. The root comes from local policy.
  const snapshot=strictParse(new Uint8Array(snapshotBytes));
  const unit=strictParse(new Uint8Array(unitBytes));
  const catalog=expectedIntents===undefined?undefined:structuredClone(expectedIntents);
  if (snapshot.corpusRootDigest!==expectedRoot) fail('unexpected_corpus_root');
  const archives=new Map(),checks=[];
  await verifySnapshot(snapshot,async uri=>{
    // Keep a private copy: an ArrayBuffer view would let the caller change verified bytes before use.
    const bytes=new Uint8Array(await getArchive(uri)).slice();archives.set(uri,bytes);return bytes;
  },catalog,checks);
  const member=snapshot.inventory.units.find(u=>u.unitId===unit.unitId);
  if (!member || !Buffer.from(canonical(member)).equals(Buffer.from(canonical(unit)))) fail('unit_snapshot_membership');
  const source=path=>{
    const item=snapshot.inventory.items.find(i=>i.sourcePath===path);
    if(!item || !archives.has(item.uri)) fail('source_missing');
    const archive=strictParse(archives.get(item.uri));
    return Buffer.from(archive.contentBase64,'base64');
  };
  const recipes=strictParse(source('spec/governed-context-runtime/attestation-recipes.json'));
  const recipe=recipes.profiles && Object.hasOwn(recipes.profiles,unit.canonicalization) ? recipes.profiles[unit.canonicalization] : undefined;
  if(!recipe || typeof recipe!=='object') fail('unknown_profile');
  // Coverage is derived from the recipe inside the verified snapshot, not a second list.
  const covered=recipe.requiredFieldsInPreimage ?? [];
  if(!Array.isArray(covered) || !covered.every(field=>typeof field==='string')) fail('invalid_recipe_coverage');
  return {
    unit,
    selectedValue:select(strictParse(source(unit.sourcePath),{historical:true}),unit.selector),
    verification:{
      corpusRootDigest:expectedRoot,snapshotUri:'/v0/snapshots/'+expectedRoot.slice(8),
      snapshotMembership:'verified-complete-record',snapshotChecks:checks.length,
      independentlySuppliedCatalog:catalog!==undefined,
      legacyDigest:{scope:unit.digestScope,profile:unit.canonicalization,recipe,
        recordFieldsCovered:covered,recordFieldsOutsideDigest:Object.keys(unit).filter(k=>!covered.includes(k))},
      integrityOnly:true,signatureTrust:'not-established',usePermission:'not-evaluated',
    },
  };
}
