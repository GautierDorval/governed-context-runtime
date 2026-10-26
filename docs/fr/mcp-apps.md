# Compagnon MCP Apps local

[English](../en/mcp-apps.md) · [Qualification datée](../../records/mcp-apps-2026-10-26.md)

Cet exemple facultatif permet de sélectionner et d’inspecter un **pack fictif entier**, puis de fournir explicitement sa projection texte complète à un hôte conversationnel. Le besoin disponible est `representation-gap`, version `semantic-boundaries-1`, en français ou en anglais. Il s’agit d’un prototype local, sans offre déployée ni compatibilité générale déclarée. L’adaptateur Runtime hébergé constitue un autre raccordement.

Deux essais du parcours attendu ont échoué après déclaration de capacité, soumission, accusé reçu et envoi du message suivant. Le modèle a déclaré ne disposer que du catalogue et n’a pas restitué les conditions du pack. L’étape de défaillance et sa cause restent inconnues. Ces déclarations ne constituent pas une télémétrie de son entrée.

**Diagnostic réel du 26 octobre 2026 : essais A/B non exécutés.** Dans Claude Desktop 3.6556.2 pour Windows, les deux nouvelles conversations affichent le composant, mais sa connexion à l’hôte reste en attente ; inspection et soumission sont désactivées. Aucun jeton n’a été soumis. C et D ne sont pas déclenchés. La cause reste inconnue et le volet d’observation demeure ouvert. Les tests locaux du diagnostic ne remplacent pas cet essai réel.

## Architecture et confiance

Les sources se trouvent dans [spec/examples/mcp-apps](../../spec/examples/mcp-apps/README.md). Le préparateur matérialise six fichiers de référence inchangés depuis le commit Git `57a09f1830ed20864ec66a6d153fc230b0331865`, vérifie leurs empreintes SHA-256 et place l’application installée **hors du dossier de référence**. Le compagnon ne maintient aucune copie divergente du vérificateur. Le paquet racine, sa politique de dépendances, le kit historique et les contrats restent inchangés.

Chaque inspection réutilise `inspectVerifiedPack` sur le snapshot complet et ses archives. La racine attendue vient de l’ancre pédagogique épinglée séparément, jamais d’une autodéclaration du pack sélectionné. Les deux langues appartiennent au même corpus, mais chaque sélection conserve son identité de pack et sa langue. Cette racine sert à vérifier l’intégrité d’un exemple fictif  ; elle n’authentifie aucune autorité métier. La confiance dans les signatures n’est pas établie et la permission d’usage n’est pas évaluée.

Le composant présente les conditions, exclusions, preuves nécessaires, déductions interdites, le pack déclaré complet, les unités, le manifeste et les sources archivées. Les octets originaux du pack et du manifeste restent accessibles en base64. La présentation et la projection texte soumise ne sont pas qualifiées d’octets originaux vérifiés. Le texte archivé est disponible localement  ; les URL déclarées ne sont jamais consultées.

## Données et états

| Opération | Données et portée |
| --- | --- |
| Ouvrir le sélecteur | Catalogue seulement. Aucun pack complet ajouté automatiquement au contexte du modèle. |
| Choisir la langue | Invalidation de l’aperçu et de l’acceptation pour la sélection courante. L’historique déjà transmis ne peut pas être retiré. |
| Inspecter | Vérification complète. Aperçu et projection dans `_meta`, lisibles par le composant et son hôte. Identité et racine également dans le texte du résultat. Ces métadonnées ne sont pas secrètes. |
| Fournir le contexte | Requête explicite `ui/update-model-context`, avec conditions, exclusions et texte des sources archivées. |
| Recevoir un accusé | Accusé de la requête par l’hôte  ; aucune preuve d’usage effectif par le modèle. |
| Demander une explication | Requête distincte `ui/message`. La personne observe la réponse dans le clavardage  ; le composant ne peut pas la lire. |
| Utiliser le repli texte | `read_gcr_pack` fournit immédiatement la projection complète dans le texte visible par le modèle, après demande de l’utilisateur. |

Aucun pack complet n’est placé dans `structuredContent`. Une erreur invalide le contexte utilisable. Les réponses asynchrones tardives ne peuvent pas valider une autre sélection. Un refus, un délai expiré ou un accusé absent reste **non confirmé**, puisque l’hôte peut avoir reçu la requête. Une projection trop volumineuse est refusée sans troncature. Le composant ne consulte aucun site et n’accorde aucune permission d’action métier.

## Reproduire localement

Prérequis  : Node.js 24.17.0 ou supérieur et un dépôt Git contenant le commit épinglé. Depuis la racine du dépôt public, dans PowerShell  :

```powershell
$companionDir = Join-Path $env:TEMP ("gcr-mcp-apps-" + [guid]::NewGuid())
node .\spec\examples\mcp-apps\prepare.mjs $companionDir
Push-Location $companionDir
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
Pop-Location
```

Ne lancez pas `npm install` dans les sources du compagnon à l’intérieur du dépôt de référence. Les dépendances sont isolées et verrouillées  : ext-apps 2.0.3, client et serveur MCP 2.0.0, Zod 4.6.7 et esbuild 0.28.2. Le build incorpore les véritables textes de licence et notices des paquets installés. Le texte transitoire de licence du tag ext-apps est plus précis que ses métadonnées de paquet  ; les notices livrées sont conservées.

Le parcours navigateur facultatif utilise un module Puppeteer déjà installé, sans télécharger de navigateur  :

```powershell
node "$companionDir\test\browser.mjs" --puppeteer "C:\chemin\vers\puppeteer\lib\puppeteer\puppeteer.js" --output (Join-Path $env:TEMP "gcr-visual")
```

Ce parcours utilise le serveur stdio réel et AppBridge officiel dans un **hôte simulé sans modèle**. Sa réussite ne prouve pas une compatibilité avec un client conversationnel. Inspectez les captures mobiles en plus de `results.json`.

## Essayer dans Claude Desktop

Fusionnez une entrée dans `mcpServers` du fichier accessible par Paramètres > Développeur > Modifier la configuration, en préservant tous les réglages existants. Cette commande affiche l’entrée avec les chemins réels  :

```powershell
@{mcpServers=@{'gcr-fictional-context'=@{
  command=(Get-Command node).Source
  args=@((Join-Path $companionDir 'server.mjs'))
}}} | ConvertTo-Json -Depth 5
```

Redémarrez Desktop ou rechargez sa configuration MCP. Demandez uniquement `open_gcr_selector`, sans autre outil. Inspectez une langue, cliquez sur **Fournir ce contexte**, puis sur **Demander une explication**. Vérifiez chaque état et comparez la réponse aux exclusions affichées. Aucun accès aux fichiers personnels, tunnel, identifiant, OAuth ou `ui.domain` n’est nécessaire. Retirez l’entrée d’essai et rechargez la configuration à la fin.

Un catalogue retourné sans composant visible ne prouve pas le fonctionnement de l’interface. Le repli texte reste un autre parcours  : demandez explicitement `read_gcr_pack` avec les quatre champs de sélection du catalogue, sans son libellé d’affichage. La qualification datée précise le client essayé et le résultat observé.

## Portée et sources primaires

GCR structure et vérifie un contexte  ; MCP transporte des appels et ressources  ; MCP Apps ajoute une interface dans un hôte  ; WebMCP expose des outils depuis une page de navigateur. Aucun ne prouve à lui seul vérité, permission ou fidélité des réponses. Le pilote comparatif à quatre conditions demeure **NOT_RUN**. Cet essai client n’est ni ce pilote, ni une validation métier, ni une expérience de visibilité.

Sources vérifiées le 2026-10-26  : [présentation MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview), [API App](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html#updatemodelcontext), [configuration locale Claude](https://claude.com/docs/connectors/building/mcp-apps/getting-started), [diagnostic Claude](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting), [licence ext-apps 2.0.3](https://github.com/modelcontextprotocol/ext-apps/blob/v2.0.3/LICENSE). Le serveur local négocie le protocole pris en charge par son SDK épinglé  ; il ne traduit pas implicitement le profil 2026-07-28 de l’adaptateur hébergé.

## Diagnostic facultatif par jeton

Le diagnostic est désactivé par défaut. Ouvrez **Diagnostic facultatif** et activez-le explicitement. **Court** fournit uniquement une enveloppe de 140 octets UTF-8, sans pack. **Complet** exige une nouvelle inspection de la sélection courante et ajoute la projection entière inchangée après la même enveloppe. L’enveloppe commence le texte transmis et se termine par deux sauts de ligne. Elle ne fait pas partie des données GCR vérifiées. La limite locale reste 200 000 octets UTF-8, enveloppe comprise, sans troncature ; ce n’est pas une limite démontrée du client.

À chaque clic de soumission, le navigateur tire 16 octets cryptographiques et les encode en 32 caractères hexadécimaux pour `gcrDiagnosticNonce`. Il génère un identifiant d’essai indépendant. L’absence de `crypto.getRandomValues` ou du calcul SHA-256 Web Crypto refuse l’essai ; aucun repli `Math.random` n’existe. Le SDK reste épinglé à 2.0.3.

| Canal | Contenu diagnostique |
| --- | --- |
| `updateModelContext` | Seul texte qui fournit le jeton au modèle avant sa réponse. Un seul appel par soumission explicite. |
| Catalogue, inspection, `_meta`, `structuredContent`, repli `read_gcr_pack` | Aucun jeton. L’inspection précède sa génération. `_meta` n’est pas secret. |
| `ui/message` et message utilisateur | Consigne demandant le champ, jamais sa valeur attendue. L’hôte peut préparer un brouillon à envoyer manuellement. |
| Trace d’observation | Charge exacte, empreinte, taille UTF-8, jeton et chronologie en mémoire et, si disponible, dans `sessionStorage` du composant. Aucun affichage ni envoi automatique. |

Le stockage de session conserve au maximum quatre essais ; il n’est pas une frontière de sécurité contre l’hôte. Si le client le refuse, l’interface le signale et un rechargement peut perdre la preuve. Il faut alors une conservation séparée par l’observateur ou un résultat indéterminé. Ne donnez jamais accès à cette trace au modèle testé. La révélation exige la confirmation explicite que la réponse et le rechargement éventuel sont terminés. Une révélation prématurée contamine l’essai. Ne copiez pas le jeton dans un message, une capture ou un fichier accessible au modèle. L’interface ne lit pas la réponse et n’annonce jamais une reproduction vérifiée. Une reconnexion ou un rechargement ne soumet rien et ne rétablit pas un ancien accusé comme état utilisable.

### Procédure bornée dans le client réel

1. Identifiez le commit, le client/version/système, les capacités déclarées, le SHA-256 d’`app.html` et l’URI `ui://gcr/pack-selector-<empreinte>.html` réellement servie. Attendez la fin de chaque tour.
2. **A, une fois** : nouvelle conversation, mode court, soumission explicite et accusé, puis bouton de demande du jeton. Confirmez l’envoi réel du brouillon et consignez la réponse sans appeler d’autre outil.
3. **B, une fois** : autre nouvelle conversation, mode complet, inspection du pack français, nouveau jeton, même séquence.
4. **C, au plus une fois et seulement après échec A ou B** : privilégiez B si les deux échouent. Préservez les traces puis rechargez cette même conversation. Ne soumettez rien. Redemandez le champ dans un message ordinaire sans sa valeur. Si l’absence de nouvelle mise à jour ne peut être établie, marquez une possible réinjection comme facteur de confusion. Une trace perdue ne permet pas une comparaison exacte.
5. **D, conditionnel après échec général** : autre conversation, autre jeton fourni directement dans un message ordinaire. Ce contrôle de copie est extérieur à MCP Apps.
6. Terminez C ou excluez-le avant de révéler la preuve à l’observateur. Conservez la charge réelle, pas seulement son empreinte, et ne réutilisez jamais les jetons historiques. Ne répétez pas un résultat négatif interprétable ; une reprise exige une invalidation précise documentée.

Consigne FR : « Recopie la valeur du champ gcrDiagnosticNonce fourni par le composant. Si cette valeur n’est pas disponible dans ton contexte, réponds NON_DISPONIBLE. N’appelle aucun outil pour la rechercher. Réponds avec la valeur seule, sans explication. »

Consignez séparément la valeur exacte, le respect du format, tout appel d’outil et les événements datés. Une valeur exacte avec une phrase superflue montre sa disponibilité mais échoue au format. Une valeur absente ou incorrecte ne prouve pas une non-injection. Un résultat positif isolé ne prouve ni présence intégrale de la projection, ni fidélité, ni compatibilité générale. A positif et B négatif ne sépare pas l’effet de taille de celui du contenu. Consultez le [relevé daté, sa clôture initiale et le nouveau diagnostic](../../records/mcp-apps-2026-10-26.md).

La [source de l’API épinglée](https://github.com/modelcontextprotocol/ext-apps/blob/v2.0.3/src/app.ts) décrit la mise à disposition aux tours suivants et le remplacement de la contribution précédente. La promesse résolue constitue l’accusé, pas une télémétrie de l’entrée utilisée. Les limites de résultats d’outils citées dans le diagnostic Claude ne sont pas des limites démontrées de cette méthode.

Avis de dépendances du 26 octobre 2026 : le verrouillage existant présente deux paquets avec des avis élevés dans `npm audit` (client/serveur MCP 2.0.0, scénarios HTTP/OAuth). Ce compagnon utilise uniquement stdio, des données fictives locales et aucun OAuth. Aucune mise à niveau ni extension HTTP n’est incluse ; réévaluer ces avis avant un changement de transport ou de périmètre.
