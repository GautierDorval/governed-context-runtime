// SPDX-License-Identifier: Apache-2.0
import {ComparisonSession} from './comparison-session.mjs';
const labels={
 fr:{versionLabel:'Version : ',heading:'Comparer deux états de pack',note:'Différences de B par rapport à A. Les deux états sont choisis explicitement; aucune succession officielle ni équivalence de sens n’est déduite. Cette consultation ne transmet aucun pack au modèle. La sélection du lecteur reste indépendante.',
 A:'État A, référence choisie',B:'État B, état comparé',compare:'Comparer B à A',cancel:'Annuler le calcul',selected:'Choisissez les deux états, puis lancez la comparaison.',empty:'Catalogue de comparaison en attente.',loading:'Admission, validation et comparaison en cours…',ready:'Comparaison complète.',failed:'Comparaison refusée ou interrompue. Aucun résultat valide.',disconnected:'Connexion fermée; résultat invalidé.',
 reference:'Exemple conservé',variant:'Nouvel exemple',selectionIdentities:'Identités choisies dans le catalogue',identities:'Identités et contrôles des deux entrées',context:'Contenus complets, originaux et relations de cohérence',export:'Exporter le rapport JSON',download:'Télécharger le JSON',fallback:'Si l’hôte empêche le téléchargement, le JSON complet reste sélectionnable ci-dessous.',before:'Dans A',after:'Dans B',absent:'Absent',count:'opérations structurales (pas un nombre de règles distinctes)',all:'Toutes les catégories',filter:'Catégorie affichée',shown:'opérations affichées',nodiff:'Aucune différence structurelle dans le périmètre annoncé.',bytes:'Égalité des octets du pack',structure:'Égalité de la structure du pack',yes:'oui',no:'non',add:'Ajout dans B',remove:'Présent dans A, absent de B',replace:'Valeur différente',order:'Ordre modifié',ambiguous:'Occurrences répétées : attribution du déplacement ambiguë.',
 activationConditions:'Conditions d’activation',nonApplicabilityConditions:'Exclusions',requiredEvidence:'Preuves requises',forbiddenInferences:'Déductions interdites',applicabilityAbuseBoundaries:'Limites d’applicabilité',rules:'Règles',causalContexts:'Contextes causaux',units:'Unités sélectionnées',sources:'Sources archivées',references:'Références et empreintes',metadata:'Métadonnées'},
 en:{versionLabel:'Version: ',heading:'Compare two pack states',note:'Differences in B relative to A. Both states are explicitly selected; no official succession or semantic equivalence is inferred. Inspection sends no pack to the model. The reader selection stays independent.',
 A:'State A, chosen reference',B:'State B, compared state',compare:'Compare B to A',cancel:'Cancel calculation',selected:'Choose both states, then start the comparison.',empty:'Waiting for comparison catalog.',loading:'Admitting, validating and comparing…',ready:'Complete comparison.',failed:'Comparison refused or interrupted. No valid result.',disconnected:'Connection closed; result invalidated.',
 reference:'Retained example',variant:'New example',selectionIdentities:'Selected catalog identities',identities:'Both input identities and checks',context:'Complete contents, originals and coherence relations',export:'Export JSON report',download:'Download JSON',fallback:'If the host prevents downloading, the complete JSON remains selectable below.',before:'In A',after:'In B',absent:'Absent',count:'structural operations (not a count of distinct rules)',all:'All categories',filter:'Displayed category',shown:'displayed operations',nodiff:'No structural differences within the declared scope.',bytes:'Pack bytes equal',structure:'Pack structure equal',yes:'yes',no:'no',add:'Added in B',remove:'Present in A, absent from B',replace:'Different value',order:'Order changed',ambiguous:'Repeated occurrences: move attribution is ambiguous.',
 activationConditions:'Activation conditions',nonApplicabilityConditions:'Exclusions',requiredEvidence:'Required evidence',forbiddenInferences:'Forbidden inferences',applicabilityAbuseBoundaries:'Applicability boundaries',rules:'Rules',causalContexts:'Causal contexts',units:'Selected units',sources:'Archived sources',references:'References and digests',metadata:'Metadata'}
};
export function bindComparison({app,lang,connected}){
 const el=id=>document.getElementById(id),t=()=>labels[lang()];
 let catalog=[],lastLang=lang(),url=null;
 const session=new ComparisonSession({load:(A,B,{signal})=>app.callServerTool({name:'compare_gcr_packs',arguments:{A,B}},{timeout:15000,signal}),changed:render});
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const details=(title,value)=>{const d=node('details');d.append(node('summary',title),node('pre',typeof value==='string'?value:JSON.stringify(value,null,2)));return d;};
 function choose(){
  const A=catalog.find(c=>c.id===el('c-a').value),B=catalog.find(c=>c.id===el('c-b').value);
  if(A&&B)session.select(A,B);else session.invalidate('empty');
 }
 function populate(){
  for(const [id,role] of [['c-a','reference'],['c-b','variant']]){
   const select=el(id),prior=select.value;select.replaceChildren();
   for(const entry of catalog.filter(c=>c.lang===lang())){const option=node('option',t()[entry.label]+' · '+entry.lang.toUpperCase());option.value=entry.id;select.append(option);}
   select.value=[...select.options].some(o=>o.value===prior)?prior:role+'-'+lang();
  }choose();
 }
 function render(state=session.state){
  if(url){URL.revokeObjectURL(url);url=null;}
  for(const [role,id] of [['A','c-a'],['B','c-b']])el(id+'-version').textContent=state[role]?t().versionLabel+state[role].version+' · '+state[role].lang:'';
  el('c-selection-identities').replaceChildren();el('c-selection-details').hidden=!state.A||!state.B;
  if(state.A&&state.B)el('c-selection-identities').append(details('A',state.A),details('B',state.B));
  el('c-status').textContent=(t()[state.phase]??state.phase)+(state.error?' ('+state.error+')':'');
  el('c-run').disabled=!connected()||!state.A||!state.B||state.phase==='loading';
  el('c-cancel').hidden=state.phase!=='loading';
  el('c-result').hidden=!state.report;
  el('c-groups').replaceChildren();el('c-proof').replaceChildren();el('c-context').replaceChildren();el('c-export-text').textContent='';
  if(!state.report)return;
  const r=state.report,ids=r.operations.map(op=>op.id);
  if(new Set(ids).size!==ids.length||JSON.stringify([...ids].sort())!==JSON.stringify([...r.groups.flatMap(g=>g.operationIds)].sort()))throw Error('render_group_coverage_failed');
  el('c-summary').textContent=r.operations.length+' '+t().count+'. '+t().bytes+': '+t()[r.equality.packBytes?'yes':'no']+'. '+t().structure+': '+t()[r.equality.packStructure?'yes':'no']+'.';
  el('c-proof').append(details('A',r.A),details('B',r.B));
  el('c-context').append(details('A',r.context.A),details('B',r.context.B),details(lang()==='fr'?'Octets originaux (base64)':'Original bytes (base64)',r.originals),details(lang()==='fr'?'Cohérence déclarée':'Declared coherence',r.coherence));
  const filter=el('c-filter'),previous=filter.value;filter.replaceChildren();const all=node('option',t().all);all.value='all';filter.append(all);
  for(const group of r.groups){const option=node('option',t()[group.category]??group.category);option.value=group.category;filter.append(option);}
  filter.value=[...filter.options].some(o=>o.value===previous)?previous:'all';
  for(const group of r.groups){
   const container=node('details');container.dataset.category=group.category;container.open=true;
   container.append(node('summary',(t()[group.category]??group.category)+' ('+group.operationIds.length+')'));
   for(const id of group.operationIds){
    const op=r.operations.find(o=>o.id===id),item=node('details');item.dataset.operation=id;
    item.append(node('summary',t()[op.kind]+' · '+(op.pathB??op.pathA)));
    const path=node('p',op.id+' · A: '+(op.pathA??t().absent)+' · B: '+(op.pathB??t().absent));path.className='identity small';item.append(path);
    if(op.ambiguous)item.append(node('p',t().ambiguous));
    item.append(node('h3',t().before),node('pre',Object.hasOwn(op,'before')?JSON.stringify(op.before,null,2):t().absent));
    item.append(node('h3',t().after),node('pre',Object.hasOwn(op,'after')?JSON.stringify(op.after,null,2):t().absent));if(op.category==='sources'&&(op.pathB??op.pathA).endsWith('/contentBase64'))for(const side of ['before','after'])if(typeof op[side]==='string'){
     let decoded;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(op[side]),c=>c.charCodeAt(0)));}catch{decoded=lang()==='fr'?'Source non UTF-8 : consulter les octets base64.':'Non-UTF-8 source: inspect the base64 bytes.';}
     item.append(details((lang()==='fr'?'Texte archivé décodé, ':'Decoded archived text, ')+t()[side],decoded));
    }container.append(item);
   }el('c-groups').append(container);
  }
  if(el('c-groups').querySelectorAll('[data-operation]').length!==ids.length)throw Error('render_operation_coverage_failed');
  if(!ids.length)el('c-groups').append(node('p',t().nodiff));
  const exported=JSON.stringify(r,null,2)+'\n';el('c-export-text').textContent=exported;
  url=URL.createObjectURL(new Blob([exported],{type:'application/json'}));el('c-download').href=url;
  applyFilter();
 }
 function applyFilter(){
  const selected=el('c-filter').value;
  for(const group of el('c-groups').children)if(group.dataset.category)group.hidden=selected!=='all'&&group.dataset.category!==selected;
  const visible=[...el('c-groups').querySelectorAll('[data-operation]')].filter(n=>!n.parentElement.hidden).length;
  el('c-shown').textContent=visible+' / '+(session.state.report?.operations.length??0)+' '+t().shown;
 }
 function localize(){
  for(const [id,key] of Object.entries({'c-selection-heading':'selectionIdentities','c-heading':'heading','c-note':'note','c-a-label':'A','c-b-label':'B','c-run':'compare','c-cancel':'cancel','c-proof-heading':'identities','c-context-heading':'context','c-export-heading':'export','c-download':'download','c-fallback':'fallback','c-filter-label':'filter'}))el(id).textContent=t()[key];
  if(lastLang!==lang()){lastLang=lang();populate();}else render();
 }
 el('c-a').addEventListener('change',choose);el('c-b').addEventListener('change',choose);
 el('c-run').addEventListener('click',()=>session.compare());el('c-cancel').addEventListener('click',()=>session.invalidate());
 el('c-filter').addEventListener('change',applyFilter);
 el('comparison').addEventListener('toggle',()=>{if(!el('comparison').open)session.invalidate();});
 localize();
 return {setCatalog(value){catalog=value;populate();},localize,disconnect(){session.invalidate('disconnected');},refresh(){render();},session};
}
