// SPDX-License-Identifier: Apache-2.0
import {bindComparison} from './comparison-ui.mjs';
import {createReportLoader} from './web-transport.mjs';
const manifest=__WEB_MANIFEST__;
const lang=()=>document.documentElement.lang;
const load=createReportLoader(manifest,{baseUrl:new URL('../',import.meta.url)});
const messages={
 fr:{note:'Choisissez A et B dans les deux états fictifs publiés. Chaque paire a été admise, comparée et vérifiée lors de la construction. Aucun document privé ni contexte de modèle n’est transmis.',loading:'Chargement et contrôle du rapport publié…',cancel:'Annuler le chargement',fallback:'Le téléchargement contient le rapport complet, ses identités, toutes les opérations et les originaux. Le JSON reste également sélectionnable ci-dessous.'},
 en:{note:'Choose A and B from the two published fictional states. Every pair was admitted, compared and verified during the build. No private document or model context is transmitted.',loading:'Loading and checking the published report…',cancel:'Cancel loading',fallback:'The download contains the complete report, identities, all operations and originals. The JSON also remains selectable below.'}
};
const app={callServerTool:({name,arguments:args},options)=>{
 if(name!=='compare_gcr_packs')throw Error('web_operation_refused');return load(args.A,args.B,options);
}};
const view=bindComparison({app,lang,connected:()=>true,messages});
view.setCatalog(manifest.catalog);
window.addEventListener('pagehide',()=>view.disconnect());
