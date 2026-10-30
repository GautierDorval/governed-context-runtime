// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {comparisonCatalog} from './comparison-data.mjs';
import {runComparison} from './comparison-runner.mjs';
import {ComparisonSession} from './comparison-session.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const out=resolve(process.argv[2]??join(root,'web-dist'));
const qualification=process.argv.includes('--qualification');
const provenance=JSON.parse(await readFile(join(root,'.gcr-companion-artifact.json'),'utf8'));
assert.match(provenance.sourceCommit??'',/^[a-f0-9]{40}$/);
assert.match(provenance.sourceTree??'',/^[a-f0-9]{40}$/);
assert.equal(typeof provenance.sourceDirty,'boolean');
if(provenance.sourceDirty&&!qualification)throw Error('web_publication_requires_clean_source');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [name,expected] of Object.entries(provenance.artifactSourceDigests??{}))assert.equal(digest(await readFile(join(root,name))),expected,'artifact_source_changed:'+name);
assert.ok(Object.keys(provenance.artifactSourceDigests??{}).length>20);
const manifest={schemaVersion:'gcr-published-comparisons-1',sourceCommit:provenance.sourceCommit,sourceTree:provenance.sourceTree,sourceDirty:provenance.sourceDirty,qualificationOnly:qualification,computation:'build-time-full-admission-and-comparison',catalog:comparisonCatalog,reports:[]};
// mkdir is exclusive: a stale publication directory is never reused.
await mkdir(out);await mkdir(join(out,'reports'));await mkdir(join(out,'assets'));
for(const A of comparisonCatalog)for(const B of comparisonCatalog.filter(c=>c.lang===A.lang)){
 const report=await runComparison(A.id,B.id);
 assert.equal(report.status,'complete');assert.deepEqual(report.errors,[]);
 assert.equal(report.A.fictional,true);assert.equal(report.B.fictional,true);
 const session=new ComparisonSession({load:async()=>({_meta:{gcr:{comparison:report}}})});session.select(A,B);await session.compare();assert.equal(session.state.phase,'ready');
 const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n'),sha256=digest(bytes),path='reports/'+sha256+'.json';
 assert.ok(bytes.length<=8*1024*1024);await writeFile(join(out,path),bytes);
 manifest.reports.push({A:A.id,B:B.id,path,sha256,bytes:bytes.length,operations:report.operations.length});
}
assert.equal(manifest.reports.length,8);
await writeFile(join(out,'catalog.json'),JSON.stringify(manifest,null,2)+'\n');
const result=await build({entryPoints:[join(root,'web-ui.mjs')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',legalComments:'inline',define:{__WEB_MANIFEST__:JSON.stringify(manifest)}});
await writeFile(join(out,'assets','app.js'),result.outputFiles[0].contents);
const template=await readFile(join(root,'ui.html'),'utf8');
const style=template.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const start=template.indexOf('<details id="comparison">'),end=template.indexOf('<details><summary id="host-heading">');
assert.ok(style&&start>0&&end>start);
const comparison=template.slice(start,end).replace('<details id="comparison">','<details id="comparison" open>');
const languages={fr:{title:'Comparer deux états de contexte',intro:'Examinez ce qui change dans les conditions, les exclusions, les preuves et les sources avant de réutiliser un contexte.',scope:'Démonstration publique · exemples fictifs',language:'Langue',limits:'Ce catalogue contient deux états fictifs par langue. Les rapports complets sont calculés et vérifiés à la construction, puis contrôlés lors du chargement. Aucune équivalence de sens, permission d’action ou amélioration d’une réponse n’est déduite.',docs:'Méthode, périmètre et limites',license:'Licences',version:'Version publiée',noScript:'Activez JavaScript pour choisir les deux états et consulter les différences.',footer:'Par Gautier Dorval · Governed Context Runtime'},en:{title:'Compare two context states',intro:'Inspect changes to conditions, exclusions, evidence and sources before reusing context.',scope:'Public demonstration · fictional examples',language:'Language',limits:'This catalog contains two fictional states per language. Complete reports are computed and verified at build time, then checked when loaded. No semantic equivalence, permission to act or improvement in an answer is inferred.',docs:'Method, scope and limits',license:'Licences',version:'Published version',noScript:'Enable JavaScript to select both states and inspect their differences.',footer:'By Gautier Dorval · Governed Context Runtime'}};
for(const [lang,t] of Object.entries(languages)){
 const title=t.title+' | Governed Context Runtime';
 const html='<!doctype html>\n<html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><meta name="description" content="'+t.intro+'"><link rel="canonical" href="https://gcr-pack-comparison.ctvf.workers.dev/'+lang+'/"><link rel="alternate" hreflang="fr" href="https://gcr-pack-comparison.ctvf.workers.dev/fr/"><link rel="alternate" hreflang="en" href="https://gcr-pack-comparison.ctvf.workers.dev/en/"><link rel="stylesheet" href="/assets/style.css"></head><body><main><header><p class="eyebrow">'+t.scope+'</p><nav aria-label="'+t.language+'"><a href="/fr/" lang="fr"'+(lang==='fr'?' aria-current="page"':'')+'>Français</a> · <a href="/en/" lang="en"'+(lang==='en'?' aria-current="page"':'')+'>English</a></nav><h1>'+t.title+'</h1><p>'+t.intro+'</p></header><p class="small">'+t.limits+'</p><noscript><p class="note">'+t.noScript+'</p></noscript>'+comparison+'<footer><p>'+t.footer+'</p><p><a href="https://github.com/GautierDorval/governed-context-runtime/blob/'+provenance.sourceCommit+'/docs/'+lang+'/pack-comparison.md">'+t.docs+'</a> · <a href="/third-party-notices.txt">'+t.license+'</a> · <a href="/version.json">'+t.version+'</a></p></footer></main><script type="module" src="/assets/app.js"></script></body></html>\n';
 await mkdir(join(out,lang));await writeFile(join(out,lang,'index.html'),html);
 if(lang==='fr')await writeFile(join(out,'index.html'),html);
}
await writeFile(join(out,'assets','style.css'),style+'\nnav{display:flex;gap:12px;justify-content:flex-end}a{color:#155766}a:focus-visible{outline:3px solid #d27600;outline-offset:3px}footer{border-top:1px solid #bacbd0;margin-top:32px;padding-top:16px}#c-download{display:inline-block;padding:12px;border:1px solid #155766;border-radius:6px}#c-run{scroll-margin-top:16px}\n');
await writeFile(join(out,'third-party-notices.txt'),await readFile(join(root,'third-party-notices.txt')));
await writeFile(join(out,'version.json'),JSON.stringify({schemaVersion:'gcr-comparison-web-version-1',gitSha:manifest.sourceCommit,gitTree:manifest.sourceTree,sourceDirty:manifest.sourceDirty,qualificationOnly:qualification,catalogSha256:digest(await readFile(join(out,'catalog.json'))),reportCount:8,mode:manifest.computation},null,2)+'\n');
await writeFile(join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src \'none\'; script-src \'self\'; style-src \'self\'; connect-src \'self\'; img-src \'self\'; base-uri \'none\'; form-action \'none\'; frame-ancestors \'none\'\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/version.json\n  Cache-Control: no-store\n/catalog.json\n  Cache-Control: no-store\n/assets/app.js\n  Cache-Control: no-cache\n/reports/*\n  Cache-Control: public, max-age=31536000, immutable\n');
console.log(JSON.stringify({out,reportCount:8,reportBytes:manifest.reports.reduce((n,r)=>n+r.bytes,0),sourceCommit:manifest.sourceCommit,qualificationOnly:qualification}));
