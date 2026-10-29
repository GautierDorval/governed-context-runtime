// SPDX-License-Identifier: Apache-2.0
// Builds a NEW fictional teaching state only. Never accepts a production input.
import {readFile} from 'node:fs/promises';
import {canonical,digest,artifactPreimage,unitPreimage,verifySnapshot,strictParse} from './reference/spec/reference/verification.mjs';
const bytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
export async function buildComparisonFixture({changePack=()=>{},changeContent=()=>{},encodePack=bytes,version='comparison-example-2'}={}){
 const original=strictParse(await readFile(new URL('./reference/spec/examples/semantic-boundaries/bundle.json',import.meta.url)));
 if(original.fictional!==true||original.identity!=='boreal-quebec-technical-service-example-v1')throw Error('fixed_fictional_source_required');
 const snapshot=structuredClone(original.snapshot), inv=snapshot.inventory;
 const sources=new Map(inv.items.map(item=>[item.sourcePath,Buffer.from(strictParse(Buffer.from(original.archives[item.uri],'base64')).contentBase64,'base64')]));
 const sourcePath='public/semantic-boundaries/content.json', content=strictParse(sources.get(sourcePath));
 const boundaries=['activationConditions','nonApplicabilityConditions','requiredEvidence','forbiddenInferences','applicabilityAbuseBoundaries'];
 content.version=version;
 for(const lang of ['fr','en']){
  const locale=content.locales[lang], chain=locale.applicabilityChains[0];
  chain.requiredEvidence.unshift(lang==='fr'?'Un relevé daté de la visite technique est disponible.':'A dated record of the technical visit is available.');
  chain.nonApplicabilityConditions[0]+=lang==='fr'?' Cette exclusion doit être revue avec le responsable.':'This exclusion must be reviewed with the owner.';
  chain.activationConditions.reverse();
  locale.causalContexts[0].forbidden_derivations.push(lang==='fr'?'Ne pas déduire une date de début confirmée.':'Do not infer a confirmed start date.');
  locale.answerBoundaries[0].rule+=lang==='fr'?' Consigner les limites dans la revue.':'Record the limits in the review.';
 }
 changeContent(content);
 sources.set(sourcePath,bytes(content));
 const artifactDigest=await digest(artifactPreimage(sourcePath,sources.get(sourcePath)));
 for(const unit of inv.units)unit.digest=await digest(unitPreimage(unit,sources.get(unit.sourcePath)));
 sources.set('public/attested-interpretive-units.json',bytes({units:inv.units}));
 const digestRegistry=strictParse(sources.get('public/content-digests.json'));
 for(const artifact of digestRegistry.artifacts)if(artifact.sourcePath===sourcePath)artifact.digest=artifactDigest;
 sources.set('public/content-digests.json',bytes(digestRegistry));
 const registry=strictParse(sources.get('public/context-pack-registry.json'));
 for(const entry of inv.packs){
  const pack=strictParse(sources.get(entry.payloadSourcePath));
  pack.version=content.version;pack.corpusVersion=content.version;
  Object.assign(pack,structuredClone(content.locales[pack.lang]));
  for(const field of boundaries)pack[field]=structuredClone(pack.applicabilityChains[0][field]);
  for(const unit of pack.includedUnits)unit.digest=inv.units.find(u=>u.unitId===unit.unitId).digest;
  for(const artifact of pack.includedArtifacts)if(artifact.sourcePath===sourcePath)artifact.digest=artifactDigest;
  changePack(pack);
  const raw=encodePack(pack);sources.set(entry.payloadSourcePath,raw);
  entry.version=content.version;entry.payloadDigest=await digest(canonical(pack,{historical:true,nfc:true}));entry.payloadFileDigest=await digest(raw);
  const manifest=strictParse(sources.get(entry.manifestSourcePath));
  Object.assign(manifest,{version:content.version,corpusVersion:content.version,payloadDigest:entry.payloadDigest,payloadFileDigest:entry.payloadFileDigest});
  const manifestRaw=bytes(manifest);sources.set(entry.manifestSourcePath,manifestRaw);
  entry.manifestDigest=await digest(canonical(manifest,{historical:true,nfc:true}));entry.manifestFileDigest=await digest(manifestRaw);
  const registered=registry.packs.find(p=>p.packId===entry.packId);
  for(const field of Object.keys(registered))if(Object.hasOwn(entry,field))registered[field]=structuredClone(entry[field]);
 }
 registry.corpusVersion=content.version;sources.set('public/context-pack-registry.json',bytes(registry));
 const expectedIntents=structuredClone(original.expectedIntents);
 for(const intent of expectedIntents)intent.version=content.version;
 for(const path of ['public/intent-registry.json','data/runtime/intent-registry.source.json']){
  const doc=strictParse(sources.get(path));doc.intents=expectedIntents;sources.set(path,bytes(doc));
 }
 const archives={};
 for(const item of inv.items){
  const raw=sources.get(item.sourcePath);item.repositoryDigest=await digest(raw);item.version=item.repositoryDigest;item.byteLength=raw.length;
  const envelope=canonical({type:'RuntimeSourceArchive',schemaVersion:'0.1.0-proposed',sourcePath:item.sourcePath,digest:item.repositoryDigest,digestAlgorithm:'sha-256',digestScope:'repository-bytes',encoding:'base64',contentBase64:raw.toString('base64')});
  item.digest=await digest(envelope);item.uri='/v0/artifacts/'+item.digest.slice(8);archives[item.uri]=Buffer.from(envelope).toString('base64');
 }
 inv.corpusVersion=content.version;
 snapshot.corpusRootDigest=await digest(canonical(inv));snapshot.snapshotId='governed-context-runtime:'+snapshot.corpusRootDigest;
 await verifySnapshot(snapshot,uri=>Buffer.from(archives[uri],'base64'),expectedIntents);
 return {fictional:true,identity:'boreal-comparison-example-2',expectedIntents,snapshot,archives};
}
