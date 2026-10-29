// SPDX-License-Identifier: Apache-2.0
import './data.mjs'; // Verify all pinned reference bytes before using the reference.
import {readFile} from 'node:fs/promises';
import {strictParse,canonical} from './reference/spec/reference/verification.mjs';
import {admitComparison} from './comparison-admission.mjs';
import {compareAdmitted} from './comparison.mjs';
const read=async path=>strictParse(await readFile(new URL(path,import.meta.url)));
const bundles=[await read('./reference/spec/examples/semantic-boundaries/bundle.json'),await read('./comparison-example.json')];
const anchors=[await read('./reference/spec/examples/semantic-boundaries/expected-root.json'),await read('./comparison-anchor.json')];
export const comparisonCatalog=Object.freeze(bundles.flatMap((bundle,index)=>['fr','en'].map(lang=>{
 const entry=bundle.snapshot.inventory.packs.find(p=>p.lang===lang);
 return Object.freeze({id:(index===0?'reference':'variant')+'-'+lang,fictional:true,packId:entry.packId,intentToken:entry.intentToken,lang,version:entry.version,
  expectedRoot:anchors[index].expectedRoot,packBytesDigest:entry.payloadFileDigest,label:index===0?'reference':'variant'});
})));
export async function loadComparisonEntry(id){
 const selection=comparisonCatalog.find(c=>c.id===id);if(!selection)throw Error('comparison_selection_not_admitted');
 const index=id.startsWith('reference-')?0:1,bundle=bundles[index];
 return admitComparison({snapshotBytes:canonical(bundle.snapshot),expectedRoot:selection.expectedRoot,
  // Both teaching catalogs are co-produced with their bundle, not independent evidence.
  rootProvenance:index===0?anchors[index].trustScope:anchors[index].provenance,fictional:true,
  intentToken:selection.intentToken,lang:selection.lang,version:selection.version,
  getArchive:uri=>{if(!Object.hasOwn(bundle.archives,uri))throw Error('required_archive_missing');return Buffer.from(bundle.archives[uri],'base64');}});
}
export async function compareCatalog(A,B){return compareAdmitted(await loadComparisonEntry(A),await loadComparisonEntry(B));}
