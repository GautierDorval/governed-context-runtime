# Utiliser l’instance de gautierdorval.com

Un assistant doit parfois expliquer une doctrine sans la confondre avec un produit ou une permission d’agir. Le Runtime lui fournit un contexte déjà préparé : une intention déclarée, une langue, une version, des sources et des limites d’interprétation. L’intégrateur peut examiner cet ensemble avant de le transmettre à l’assistant.

L’instance est accessible sur **[context.gautierdorval.com](https://context.gautierdorval.com/)**. Elle distribue les mêmes artefacts par HTTP et par un adaptateur MCP séparé. Ce dépôt fournit les contrats et les vérificateurs de référence ; le service hébergé et son corpus ont leur propre cycle de publication.

## État observé

La plus récente observation datée du producteur dans cette édition est celle du [19 octobre 2026](../../evidence/instance-2026-10-19.json). Elle consigne 564 réponses de fichiers racine, six échanges MCP avec cinq comparaisons directes au Runtime et un contrôle GET/HEAD distinct sur 156 ressources indexées. Ces contrôles réussissent après le déploiement coordonné des services, sans garantir une disponibilité continue. Les relevés des 12 et 14 octobre ci-dessous sont historiques.

### Contrôle historique du 12 octobre

Le **12 octobre 2026 à 02:18 UTC**, un contrôle technique du producteur a confirmé les réponses HTTP, la découverte des huit outils MCP et l’égalité exacte du pack français `representation-gap` reçu par les deux transports. Le registre observé contient six intentions et douze packs FR/EN. Les versions sont distinguées dans le tableau ci-dessous.

[Observation datée et empreintes des réponses](../../evidence/instance-2026-10-12.json) · [Portée des preuves](../../evidence/README.md)

Cette observation établit le fonctionnement décrit à cette date, sans garantir la disponibilité future. Les appels de contrôle sont du trafic technique initié par le producteur, sans appel à un modèle. Ils ne mesurent pas l’adoption ni l’effet du contexte sur une réponse.

## Versions et identifiants

Chaque identifiant désigne une chose différente ; une concordance de numéros d’une ligne à l’autre n’a aucune signification.

| Identifiant | Ce qu’il désigne |
|---|---|
| `0.2.0-proposed` dans ce dépôt | Les contrats, le vérificateur et les exemples de référence. Les éditions datées (2026-10-12, 2026-10-13, 2026-10-14, 2026-10-17, 2026-10-18, 2026-10-19) ajoutent documentation, exemples, tests et outils d’entretien sans modifier les octets existants des contrats, du vérificateur ni des exemples. |
| `runtimeVersion` `0.3.0-proposed` | Le logiciel du Runtime hébergé. |
| `schemaVersion` `0.1.0-proposed` | Les contrats proposés de l’instantané, de l’inventaire, des archives et des erreurs. |
| Révision MCP `2026-07-28` | Le profil de protocole servi par l’adaptateur MCP. |
| `corpusVersion` | Une étiquette de famille. Les instantanés successifs d’une même lignée de corpus gardent la même étiquette, qui n’identifie donc pas le contenu. |
| Racine de corpus `sha-256:…` | Un instantané exact. C’est le seul identifiant du contenu du corpus. |
| `version` d’un pack | La version d’un pack dans un instantané, par exemple `0.1.0` ; une même version de pack peut figurer sous plusieurs racines. |
| `publicationId` dans `evidence/publication.json` | La projection publique synthétique. Ce n’est pas une racine de corpus. |

L’observation du 12 octobre 2026 a relevé la racine `sha-256:367be59f…`, donnée en entier dans le fichier de preuve. `/v0/lifecycle` liste les racines disponibles aujourd’hui ; il ne dit pas quand chacune a été servie. Une étiquette de version de ce dépôt identifie le contenu du dépôt : elle ne contient ni ne signe une racine de corpus de production, et les clés de la démonstration sont des clés de test.

La [vérification historique du déploiement du 14 octobre](../../evidence/instance-2026-10-14.json) relève la racine qui était courante à cette date, `sha-256:d5d52ed75360d38cd1fa0e434c302d57a80ec94e9be9daaf3e8d7866fd2305e0` pendant la capture du producteur entre 14:53 et 14:54 UTC. La capture REST/MCP et la comparaison des fichiers racine réussissent. Cette observation technique datée ne démontre ni disponibilité future, ni signature de production, ni adoption, ni fidélité des modèles ; le reçu du 12 octobre conserve sa valeur historique.

L’[observation du 19 octobre](../../evidence/instance-2026-10-19.json) relève la racine courante `sha-256:beaeed142e9b3898734414eeebf7ab6283ef57dbd7c2af53479405395e5a4fe4` pendant la capture applicative finale de 14:11:55 à 14:12:13 UTC. Les packs courants français et anglais `interpretive-governance-overview` utilisent la version `0.1.1` ; le pack anglais `0.1.0`, contrôlé séparément, conserve sa racine historique. La version se choisit par intention : les exemples `representation-gap` ci-dessous épinglent explicitement la version `0.1.0`.

L’index expose encore `status: stable` ; ce champ ne qualifie ni l’interface ni le profil de signature. Lire les champs `maturity` distincts : interface et recettes d’attestation proposées, signature de test seulement et évaluation scientifique non exécutée. Dans `/v0/health`, `mcpEnabled: false` porte sur `this-resolver-worker-only`. L’adaptateur hébergé séparément est indiqué sous `externalAdapters.mcp` ; sa disponibilité doit être vérifiée à cette adresse. L’observation du 19 octobre comprend des échanges MCP réussis.

L’implémentation des Workers de production est maintenue dans un dépôt privé. Un `sourceCommit` de déploiement comme `7328776…` identifie cette source privée et ne se résout pas dans ce dépôt public de référence. Le code public contient les contrats de référence, les vérificateurs et les exemples, mais pas l’implémentation des Workers de production. Dans les métadonnées de santé, `deployment.timestamp` désigne la création de la version, pas le début de son trafic de production. `sourceCommitVerified: false` demeure une limite de provenance vérifiable indépendamment.

Sur une archive immuable, un instantané adressé par digest ou un pack épinglé par version, `X-Corpus-Root-Digest` peut conserver la racine relevée lors de la mise en cache de cette réponse. Ce n’est pas un signal de fraîcheur du corpus courant. Lire `/v0/snapshot` pour sélectionner la racine courante, puis vérifier l’inventaire choisi et les octets des ressources référencées. Distinguer les racines historiques de la découverte courante.

## 1. Choisir un contexte déclaré

Lire le registre avant de choisir un identifiant. Par exemple, `representation-gap` sert à examiner un écart déjà identifié entre une représentation et les sources publiées. Le Runtime ne déduit pas cette intention d’un texte libre.

```powershell
$runtimeOrigin = 'https://context.gautierdorval.com'
$intents = Invoke-RestMethod "$runtimeOrigin/v0/intents"
$pack = Invoke-RestMethod "$runtimeOrigin/v0/packs/representation-gap/fr?version=0.1.0"
$manifest = Invoke-RestMethod "$runtimeOrigin/v0/packs/representation-gap/fr/manifest?version=0.1.0"
```

Ces commandes lisent les données. La conversion JSON de PowerShell ne conserve pas les octets d’origine pour une vérification cryptographique. Pour comparer les empreintes, conserver le corps reçu avant décodage ou utiliser l’enveloppe MCP ci-dessous. Cet exemple choisit explicitement le français ; pour l’anglais, utiliser `lang = 'en'` et le chemin REST anglais correspondant.

## 2. Vérifier avant d’utiliser

Épingler séparément la racine de corpus attendue dans la politique locale du consommateur. Lire l’[instantané](https://context.gautierdorval.com/v0/snapshot), vérifier sa racine, puis toutes les archives référencées avec le [vérificateur public](../../spec/reference/verification.mjs). Vérifier ensuite l’identité, la version et l’empreinte du pack sélectionné dans cet instantané. Le [contrat de vérification](../verification.md) précise la portée des contrôles.

Une racine ou une empreinte reçue avec le contenu permet de constater une cohérence, mais ne crée pas à elle seule une référence de confiance indépendante. Une empreinte correcte ne prouve ni vérité ni autorité. La décision d’utiliser le contexte appartient au consommateur. Les signatures et clés fournies avec la démonstration restent réservées aux tests ; elles ne sont pas une chaîne de confiance de production.

Pour apprendre le parcours complet avec un jeu d’essai fictif et toutes ses archives :

```powershell
npm run demo
npm test
```

## 3. Lire le même pack par MCP

L’adaptateur répond à `POST https://context.gautierdorval.com/mcp`. Le profil servi utilise la révision **`2026-07-28`**, la découverte `server/discover` et les métadonnées par requête ci-dessous. Un client qui impose l’ancien échange `initialize` ne convient pas à ce profil. La compatibilité avec une application particulière doit être vérifiée ; la présence d’une URL MCP ne suffit pas. Les clients effectivement testés sont recensés sous [Clients testés](#clients-testés).

```powershell
$mcpUri = 'https://context.gautierdorval.com/mcp'
$mcpVersion = '2026-07-28'
$mcpMeta = @{
    'io.modelcontextprotocol/protocolVersion' = $mcpVersion
    'io.modelcontextprotocol/clientInfo' = @{
        name = 'runtime-reader'; version = '0.1.0'
    }
    'io.modelcontextprotocol/clientCapabilities' = @{}
}
$mcpHeaders = @{
    'Accept' = 'application/json'
    'MCP-Protocol-Version' = $mcpVersion
    'Mcp-Method' = 'server/discover'
}
$discoveryBody = @{
    jsonrpc = '2.0'; id = 1; method = 'server/discover'
    params = @{ _meta = $mcpMeta }
} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri $mcpUri -Method Post -ContentType 'application/json' `
    -Headers $mcpHeaders -Body $discoveryBody

$mcpHeaders['Mcp-Method'] = 'tools/call'
$mcpHeaders['Mcp-Name'] = 'get_context_pack'
$packBody = @{
    jsonrpc = '2.0'; id = 2; method = 'tools/call'
    params = @{
        _meta = $mcpMeta
        name = 'get_context_pack'
        arguments = @{
            intentToken = 'representation-gap'; lang = 'fr'; version = '0.1.0'
        }
    }
} | ConvertTo-Json -Depth 10
$reply = Invoke-RestMethod -Uri $mcpUri -Method Post -ContentType 'application/json' `
    -Headers $mcpHeaders -Body $packBody
if ($reply.error -or $reply.result.isError) { throw 'Lecture MCP refusée' }
$envelope = $reply.result.content[0].text | ConvertFrom-Json
$bytes = [Convert]::FromBase64String($envelope.contentBase64)
$observedDigest = 'sha-256:' + [Convert]::ToHexString(
    [Security.Cryptography.SHA256]::HashData($bytes)
).ToLowerInvariant()
if ($observedDigest -ne $envelope.artifactDigest) { throw 'Empreinte incohérente' }
```

PowerShell 7 est requis pour cet exemple. La dernière comparaison contrôle uniquement les octets transportés et leur empreinte déclarée. Elle ne remplace pas la vérification de l’instantané sous une racine épinglée. Aucune réponse de modèle n’est produite.

Les huit outils sont `list_intents`, `get_intent`, `list_context_packs`, `get_context_pack`, `get_pack_manifest`, `get_attested_unit`, `verify_unit_digest` et `verify_pack_digest`. Les arguments sont fermés : identifiants déclarés, langues FR/EN, versions enregistrées et empreintes. Aucun prompt ni URL arbitraire n’est attendu. Les requêtes sont limitées à 16 Kio ; les appels provenant d’un navigateur sont limités aux origines autorisées du site et du Runtime.

## Clients testés

Résultats du **14 octobre 2026**, sur des services en boucle locale : le résolveur et l’adaptateur MCP de l’implémentation Runtime de production maintenue dans un dépôt privé tournaient sous workerd (`wrangler dev`) et servaient la racine de corpus `sha-256:acf7bc39…`. Ils montrent que ces clients fonctionnent avec le contrat servi. Ce ne sont pas des observations de l’instance hébergée, que couvre la preuve datée ci-dessus. Hormis les extraits des guides, les clients ci-dessous sont des contrôles du producteur qui ne font pas partie de ce dépôt.

| Type de client | Client et version | Transport et révision | Étapes exécutées | Résultat |
|---|---|---|---|---|
| Script HTTP | PowerShell 7.6.6 `Invoke-RestMethod`, extrait de la section 1 (guides EN et FR) | REST | Registre, pack français et manifeste | Réussi |
| Script HTTP | PowerShell 7.6.6, extrait MCP de la section 3 (guides EN et FR) | POST JSON-RPC, `2026-07-28` | `server/discover`, `tools/call get_context_pack`, décodage base64, comparaison d’empreinte | Réussi |
| Contrôles HTTP | Node.js 24.17.0 et Python 3.14.6 | REST | 1 781 contrôles chacun : instantané, archives, packs, manifestes, empreintes | Réussi |
| SDK MCP | `@modelcontextprotocol/client` 2.3.1 sur Node.js 24.17.0 | Streamable HTTP, révision épinglée à `2026-07-28` | Découverte et lecture des ressources, vérification complète de l’instantané, `tools/call`, ressources historiques | Réussi |
| Client MCP indépendant | Bibliothèque standard de Python 3.14.6 | POST JSON-RPC, `2026-07-28` | Mêmes étapes, écrites séparément | Réussi |
| Échange ancien | Requête `initialize` de la révision `2025-06-18` | POST JSON-RPC | Une requête | Refusé comme documenté : HTTP 404, JSON-RPC `-32601` |
| Erreur métier | `tools/call` avec une intention non déclarée | POST JSON-RPC, `2026-07-28` | Une requête | Résultat d’outil avec `isError: true` et la liste des intentions déclarées |
| Applications agentiques | Claude Code, Codex CLI, Cursor et autres assistants | Sans objet | Aucune | Non testé : chacune exige sa propre configuration vers le point d’accès hébergé, que cette passe n’a pas réalisée |

Le SDK MCP et le client Python indépendant ont joint l’adaptateur par un hôte en boucle locale, avec le résolveur sous workerd. Un client qui exige l’échange `initialize` ne convient pas à ce profil ; cela ne dit rien de la conformité de l’un ou l’autre à sa propre révision. Un adaptateur pour les révisions antérieures est différé : ce serait un changement fonctionnel distinct, pas une correction de guide.

## Comprendre les états et les preuves

- **Runtime disponible** : les réponses techniques observées montrent un service accessible à une date donnée.
- **Transport cohérent** : le contrôle publié compare les octets REST et MCP d’un pack précis. Il ne certifie pas tous les usages d’un client.
- **Contexte vérifié** : la vérification complète exige un instantané et ses archives, sous la politique locale du consommateur.
- **Réponse fidèle** : son évaluation relève d’une expérience séparée. Les expériences sur modèles restent `NOT_RUN` à ce jour.

Dans `/v0/health`, `mcpEnabled: false` concerne uniquement le Worker résolveur. `externalAdapters.mcp` désigne l’adaptateur séparé ; sa disponibilité se vérifie sur `/mcp`. Le champ `sourceCommitVerified: false` signifie que la déclaration du commit ne constitue pas une attestation indépendante du déploiement.

La [projection synthétique](../../evidence/publication.json) demeure un exercice de lecture des états de mesure. Elle n’est pas une statistique du service hébergé. Le contrôle réel daté est conservé séparément, sans agrégation entre ces populations.

## Vérifier une unité avant utilisation

La réponse brute d’une unité v0 ne constitue pas un contexte vérifié autonome. L’en-tête HTTP `X-Corpus-Root-Digest` l’accompagne et reste accessible au JavaScript du navigateur. Un outil qui ne transmet que le corps JSON perd cet en-tête. MCP transporte la racine dans son enveloppe. Aucune de ces déclarations ne prouve à elle seule l’appartenance à l’instantané.

L’[exemple consommateur](../../spec/examples/verified-unit.mjs) reçoit le corps de l’unité, l’instantané complet, ses archives et une racine choisie séparément par la politique locale. Il vérifie l’instantané, compare **tout l’enregistrement de l’unité** à l’inventaire vérifié, puis restitue la valeur sélectionnée avec la portée de vérification. Les champs de couverture proviennent de la recette archivée dans cet instantané. L’empreinte historique d’enveloppe ne couvre que `requiredFieldsInPreimage` ; les autres champs sont explicitement recensés hors de cette empreinte. La valeur sélectionnée, son type et les tableaux de transformations exigent la vérification de l’instantané complet.

```javascript
import {inspectVerifiedUnit} from './spec/examples/verified-unit.mjs';
const inspected = await inspectVerifiedUnit({
  snapshotBytes,       // octets de l’instantané complet capturé
  unitBytes,           // corps REST ou contentBase64 MCP décodé
  expectedRoot,        // racine choisie séparément par la politique locale
  getArchive,          // uri => octets capturés, sans réseau implicite
  expectedIntents,     // catalogue indépendant facultatif
});
// Transmettre ensemble inspected.unit, inspected.selectedValue et inspected.verification.
```

Le chemin explicite est `/v0/snapshots/` suivi des 64 caractères hexadécimaux de la racine épinglée séparément. Récupérer ensuite les URI d’archives énumérées par cet instantané. L’exemple ne fait aucun appel réseau, ne valide aucune signature et ne décide d’aucune permission. Son résultat établit une cohérence avec la racine choisie, sans prouver une clé de production, l’actualité, l’autorité ou une permission d’exécution. Les [contre-épreuves](../../spec/examples/test-verified-unit.mjs) refusent une unité modifiée même si son empreinte historique reste identique.

## Lire précisément le cycle de vie et la découverte

Partir de l’index Runtime, suivre `entrypoints.health`, puis `externalAdapters.mcp.endpoint` dans la réponse de santé. `server/discover` et `tools/list` établissent le protocole et les outils proposés ; récupérer un artefact vérifie séparément sa disponibilité. L’OpenAPI REST décrit le résolveur, sans englober le transport MCP séparé.

`/v0/lifecycle` énumère actuellement les racines disponibles avec leur statut courant ou archivé et une liste d’événements vide. Cet inventaire ne constitue pas une chronologie des déploiements en production. Son ordre par empreinte ne fournit ni dates historiques de publication, ni mises à jour automatiques, ni protection persistante contre le retour en arrière. `signatureTrust: test-only` demeure une limite explicite ; l’instance hébergée n’est pas présentée comme authentifiée de bout en bout par une clé de signature de production.

[Doctrine et contexte sur gautierdorval.com](https://gautierdorval.com/doctrine/runtime-contexte-gouverne/) · [Guide de référence](README.md) · [English](../en/instance.md)
