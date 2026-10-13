// SPDX-License-Identifier: Apache-2.0
// Fixed public file inventory. This checks package consistency, not publisher identity.
import {readdir,readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
import assert from 'node:assert/strict';
import {strictParse} from '../spec/reference/verification.mjs';
const expected=[".gitattributes", ".github/ISSUE_TEMPLATE/bug-report.yml", ".github/ISSUE_TEMPLATE/config.yml", ".github/ISSUE_TEMPLATE/documentation.yml", ".github/PULL_REQUEST_TEMPLATE.md", ".github/dependabot.yml", ".github/workflows/verify.yml", "CHANGELOG.md", "CITATION.cff", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "LICENSE", "LICENSES/CC-BY-4.0.txt", "NOTICE.md", "README.md", "SECURITY.md", "assets/architecture.svg", "assets/banner.svg", "assets/social.png", "assets/social.svg", "assets/verification.svg", "docs/en/README.md", "docs/en/instance.md", "docs/fr/README.md", "docs/fr/instance.md", "docs/schemas.md", "docs/source.json", "docs/verification.md", "evidence/README.md", "evidence/instance-2026-10-12.json", "evidence/publication.json", "package-manifest.json", "package.json", "rights.json", "scripts/check-package.mjs", "spec/LICENSE", "spec/attestation-recipes.json", "spec/context-pack-manifest.schema.json", "spec/context-pack.schema.json", "spec/examples/demo.mjs", "spec/examples/synthetic/bundle.json", "spec/examples/test-verified-unit.mjs", "spec/examples/verified-unit.mjs", "spec/examples/verify-context.mjs", "spec/intent-registry.schema.json", "spec/public-evidence/README.md", "spec/public-evidence/fixture.mjs", "spec/public-evidence/store.mjs", "spec/public-evidence/test-publication.mjs", "spec/public-evidence/test-store.mjs", "spec/public-evidence/verify.mjs", "spec/reference/consumer.mjs", "spec/reference/signatures.mjs", "spec/reference/test-consumer.mjs", "spec/reference/test-public-finish.mjs", "spec/reference/test-vectors.mjs", "spec/reference/vectors.json", "spec/reference/verification.d.mts", "spec/reference/verification.mjs", "spec/runtime-snapshot.schema.json"];
const root=fileURLToPath(new URL('../',import.meta.url));
const exact=(v,fields)=>assert.deepEqual(Object.keys(v).sort(),fields.split(',').sort());
const hash=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir='') {
 const out=[];
 for(const entry of await readdir(resolve(root,dir),{withFileTypes:true})) {
  if(!dir && entry.name==='.git')continue;
  const name=[dir,entry.name].filter(Boolean).join('/'),stat=await lstat(resolve(root,name));
  assert(!stat.isSymbolicLink(),'symlink forbidden: '+name);
  if(stat.isDirectory())out.push(...await walk(name));else {assert(stat.isFile(),'non-file');out.push(name);}
 }
 return out;
}
assert.deepEqual((await walk()).sort(),expected,'unexpected or missing file');
const manifest=strictParse(await readFile(resolve(root,'package-manifest.json')));
exact(manifest,'schema,documentVersion,fictionalContextRoot,publicEvidencePublicationId,files');
assert.equal(manifest.schema,'runtime-public-package/0.2.0-proposed');
assert.equal(manifest.documentVersion,'0.2.0-proposed');
assert.deepEqual(manifest.files.map(i=>i.path).sort(),expected.filter(p=>p!=='package-manifest.json'));
const bytes=new Map();
for(const item of manifest.files) {
 exact(item,'path,sha256,bytes');assert(expected.includes(item.path));
 assert.equal(relative(root,resolve(root,item.path)).replaceAll('\\','/'),item.path);
 const raw=await readFile(resolve(root,item.path));bytes.set(item.path,raw);
 assert.equal(raw.length,item.bytes,'length:'+item.path);assert.equal(hash(raw),item.sha256,'digest:'+item.path);
 if(item.path.endsWith('.json'))strictParse(raw);
 if(item.path.endsWith('.svg')){
  const svg=raw.toString();assert(!/<script|<foreignObject|<!ENTITY|<!DOCTYPE|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(/i.test(svg),'active SVG');
 }
}
const licenceFor=p=>["assets/banner.svg", "assets/social.svg", "assets/social.png"].includes(p)?'All rights reserved':p==='LICENSES/CC-BY-4.0.txt'?'CC-BY-4.0':p.endsWith('.md')?'CC-BY-4.0':(/^(spec|scripts|\.github)\//.test(p)||["LICENSE", "package.json", ".gitattributes", "rights.json", "package-manifest.json"].includes(p))?'Apache-2.0':'CC-BY-4.0';
const rights=strictParse(bytes.get('rights.json'));
exact(rights,'schema,repositoryWideLicense,files,selfAndManifest');assert.equal(rights.schema,'runtime-file-rights/1');assert.equal(rights.repositoryWideLicense,null);
assert.deepEqual(rights.files.map(x=>x.path).sort(),expected.filter(p=>!['rights.json','package-manifest.json'].includes(p)));
for(const r of rights.files){exact(r,'path,source,license,sha256');assert.equal(r.sha256,hash(bytes.get(r.path)));assert.equal(r.license,licenceFor(r.path));}
assert.equal(rights.selfAndManifest,"rights.json and package-manifest.json are project metadata under Apache-2.0");
assert.equal(licenceFor('rights.json'),'Apache-2.0');assert.equal(licenceFor('package-manifest.json'),'Apache-2.0');
assert.deepEqual(bytes.get('LICENSE'),bytes.get('spec/LICENSE'));
assert.equal(hash(bytes.get('LICENSE')),'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30','official Apache-2.0 text, verbatim');
assert.equal(hash(bytes.get('LICENSES/CC-BY-4.0.txt')),'9e5f1b3c610b9c2da5c313bf81d577a7d1acec686bdb0384edefa6df0f90cd94','official CC BY 4.0 legal code, trailing blank line trimmed');
assert.equal(strictParse(bytes.get('package.json')).license,"Apache-2.0 AND CC-BY-4.0");
assert(!/^\s*["']?license["']?\s*:/m.test(bytes.get('CITATION.cff').toString()),'CFF lists alternative licences; the split is declared in NOTICE.md');
{const notice=bytes.get('NOTICE.md').toString();for(const p of ["assets/banner.svg", "assets/social.svg", "assets/social.png"])assert(notice.includes(p),'reserved visual missing from NOTICE: '+p);}
assert.equal(hash(bytes.get('NOTICE.md')),'7a7934e2ab684919e334e11b13c70f9859087bbc9fa23e140df7662bc65cd385','NOTICE.md must match the reviewed licence table');
assert.equal(hash(bytes.get('CITATION.cff')),'e3e06962fd3f6079f7cb4875943a0ddba2585a1be3243da428844dedce2cd80a','CITATION.cff must match the reviewed metadata');
{}
const docs=strictParse(bytes.get('docs/source.json'));
exact(docs,'schema,documentVersion,project,author,authorUrl,repository,publicSpecRepositoryPath,en,fr');
assert.equal(docs.publicSpecRepositoryPath,'https://github.com/GautierDorval/governed-context-runtime/tree/d57ee3bc6f3edf52019dc8fbe56a18b8f8ddcb9d/spec/');
const fields='title,definition,instance,status,intent,retrieval,localDecision,counterexample,evidence,limits,unitBoundary,historicalBoundary,architectureCaption,verificationCaption,lead,useCase,benefits';
assert.equal(docs.schema,'runtime-public-documentation/0.2.0-proposed');
exact(docs.en,fields);exact(docs.fr,fields);
assert(!docs.en.limits.includes('authenticates its projected content'));
assert(docs.en.limits.includes('does not authenticate the source'));
assert(docs.fr.limits.includes('n’authentifie pas sa source'));
const fixture=strictParse(bytes.get('spec/examples/synthetic/bundle.json'));
exact(fixture,'schema,fictional,provenance,expectedRoot,expectedIntents,snapshot,archives,policy,receipt');
assert.equal(fixture.fictional,true);assert.equal(fixture.expectedRoot,manifest.fictionalContextRoot);
assert.deepEqual(Object.keys(fixture.archives).sort(),fixture.snapshot.inventory.items.map(i=>i.uri).sort());
const publication=strictParse(bytes.get('evidence/publication.json'));assert.equal(publication.publicationId,manifest.publicEvidencePublicationId);
console.log(`PASS: ${expected.length} fixed paths, ${manifest.files.length} manifest entries, ${rights.files.length} rights entries`);
