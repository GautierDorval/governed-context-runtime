# Compagnon MCP Apps local

[English](../en/mcp-apps.md) · [Qualification datée](../../records/mcp-apps-2026-10-26.md)

Cet exemple facultatif permet de sélectionner et d’inspecter un **pack fictif entier**, puis de fournir explicitement sa projection texte complète à un hôte conversationnel. Le besoin disponible est `representation-gap`, version `semantic-boundaries-1`, en français ou en anglais. Il s’agit d’un prototype local, sans offre déployée ni compatibilité générale déclarée. L’adaptateur Runtime hébergé constitue un autre raccordement.

## Architecture et confiance

Les sources se trouvent dans [spec/examples/mcp-apps](../../spec/examples/mcp-apps/README.md). Le préparateur matérialise six fichiers de référence inchangés depuis le commit Git `57a09f1830ed20864ec66a6d153fc230b0331865`, vérifie leurs empreintes SHA-256 et place l’application installée **hors du dossier de référence**. Le compagnon ne maintient aucune copie divergente du vérificateur. Le paquet racine, sa politique de dépendances, le kit historique et les contrats restent inchangés.

Chaque inspection réutilise `inspectVerifiedPack` sur le snapshot complet et ses archives. La racine attendue vient de l’ancre pédagogique épinglée séparément, jamais d’une autodéclaration du pack sélectionné. Les deux langues appartiennent au même corpus, mais chaque sélection conserve son identité de pack et sa langue. Cette racine sert à vérifier l’intégrité d’un exemple fictif ; elle n’authentifie aucune autorité métier. La confiance dans les signatures n’est pas établie et la permission d’usage n’est pas évaluée.

Le composant présente les conditions, exclusions, preuves nécessaires, déductions interdites, le pack déclaré complet, les unités, le manifeste et les sources archivées. Les octets originaux du pack et du manifeste restent accessibles en base64. La présentation et la projection texte soumise ne sont pas qualifiées d’octets originaux vérifiés. Le texte archivé est disponible localement ; les URL déclarées ne sont jamais consultées.

## Données et états

| Opération | Données et portée |
| --- | --- |
| Ouvrir le sélecteur | Catalogue seulement. Aucun pack complet ajouté automatiquement au contexte du modèle. |
| Choisir la langue | Invalidation de l’aperçu et de l’acceptation pour la sélection courante. L’historique déjà transmis ne peut pas être retiré. |
| Inspecter | Vérification complète. Aperçu et projection dans `_meta`, lisibles par le composant et son hôte. Identité et racine également dans le texte du résultat. Ces métadonnées ne sont pas secrètes. |
| Fournir le contexte | Requête explicite `ui/update-model-context`, avec conditions, exclusions et texte des sources archivées. |
| Recevoir un accusé | Acceptation par l’hôte pour les prochains tours ; aucune preuve d’usage effectif par le modèle. |
| Demander une explication | Requête distincte `ui/message`. La personne observe la réponse dans le clavardage ; le composant ne peut pas la lire. |
| Utiliser le repli texte | `read_gcr_pack` fournit immédiatement la projection complète dans le texte visible par le modèle, après demande de l’utilisateur. |

Aucun pack complet n’est placé dans `structuredContent`. Une erreur invalide le contexte utilisable. Les réponses asynchrones tardives ne peuvent pas valider une autre sélection. Un refus, un délai expiré ou un accusé absent reste **non confirmé**, puisque l’hôte peut avoir reçu la requête. Une projection trop volumineuse est refusée sans troncature. Le composant ne consulte aucun site et n’accorde aucune permission d’action métier.

## Reproduire localement

Prérequis : Node.js 24.17.0 ou supérieur et un dépôt Git contenant le commit épinglé. Depuis la racine du dépôt public, dans PowerShell :

```powershell
$companionDir = Join-Path $env:TEMP ("gcr-mcp-apps-" + [guid]::NewGuid())
node .\spec\examples\mcp-apps\prepare.mjs $companionDir
Push-Location $companionDir
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
Pop-Location
```

Ne lancez pas `npm install` dans les sources du compagnon à l’intérieur du dépôt de référence. Les dépendances sont isolées et verrouillées : ext-apps 2.0.3, client et serveur MCP 2.0.0, Zod 4.6.7 et esbuild 0.28.2. Le build incorpore les véritables textes de licence et notices des paquets installés. Le texte transitoire de licence du tag ext-apps est plus précis que ses métadonnées de paquet ; les notices livrées sont conservées.

Le parcours navigateur facultatif utilise un module Puppeteer déjà installé, sans télécharger de navigateur :

```powershell
node "$companionDir\test\browser.mjs" --puppeteer "C:\chemin\vers\puppeteer\lib\puppeteer\puppeteer.js" --output (Join-Path $env:TEMP "gcr-visual")
```

Ce parcours utilise le serveur stdio réel et AppBridge officiel dans un **hôte simulé sans modèle**. Sa réussite ne prouve pas une compatibilité avec un client conversationnel. Inspectez les captures mobiles en plus de `results.json`.

## Essayer dans Claude Desktop

Fusionnez une entrée dans `mcpServers` du fichier accessible par Paramètres > Développeur > Modifier la configuration, en préservant tous les réglages existants. Cette commande affiche l’entrée avec les chemins réels :

```powershell
@{mcpServers=@{'gcr-fictional-context'=@{
  command=(Get-Command node).Source
  args=@((Join-Path $companionDir 'server.mjs'))
}}} | ConvertTo-Json -Depth 5
```

Redémarrez Desktop ou rechargez sa configuration MCP. Demandez uniquement `open_gcr_selector`, sans autre outil. Inspectez une langue, cliquez sur **Fournir ce contexte**, puis sur **Demander une explication**. Vérifiez chaque état et comparez la réponse aux exclusions affichées. Aucun accès aux fichiers personnels, tunnel, identifiant, OAuth ou `ui.domain` n’est nécessaire. Retirez l’entrée d’essai et rechargez la configuration à la fin.

Un catalogue retourné sans composant visible ne prouve pas le fonctionnement de l’interface. Le repli texte reste un autre parcours : demandez explicitement `read_gcr_pack` avec les quatre champs de sélection du catalogue, sans son libellé d’affichage. La qualification datée précise le client essayé et le résultat observé.

## Portée et sources primaires

GCR structure et vérifie un contexte ; MCP transporte des appels et ressources ; MCP Apps ajoute une interface dans un hôte ; WebMCP expose des outils depuis une page de navigateur. Aucun ne prouve à lui seul vérité, permission ou fidélité des réponses. Le pilote comparatif à quatre conditions demeure **NOT_RUN**. Cet essai client n’est ni ce pilote, ni une validation métier, ni une expérience de visibilité.

Sources vérifiées le 2026-10-26 : [présentation MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview), [API App](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html#updatemodelcontext), [configuration locale Claude](https://claude.com/docs/connectors/building/mcp-apps/getting-started), [diagnostic Claude](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting), [licence ext-apps 2.0.3](https://github.com/modelcontextprotocol/ext-apps/blob/v2.0.3/LICENSE). Le serveur local négocie le protocole pris en charge par son SDK épinglé ; il ne traduit pas implicitement le profil 2026-07-28 de l’adaptateur hébergé.
