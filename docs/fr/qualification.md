# Qualification hors ligne, 20 octobre 2026

Langue : français · [English](../en/qualification.md)

**Résultat : PASS local ; diagnostic hébergé et reproduction externe en NOT_RUN.** Le vérificateur actuel accepte les octets originaux conservés pour 11 snapshots, 59 archives par snapshot et 12 sélections exactes de packs par snapshot, soit 132 sélections. Des archives sont communes à plusieurs racines : ce ne sont pas 649 fichiers distincts. [Portée et identités lisibles par machine](../../evidence/qualification-2026-10-20.json).

## Entrées et admission

Les actifs conservés du producteur appartiennent à une révision privée identifiée. Son identité, les chemins, les empreintes et le code des harnais sont accessibles dans le dossier privé du responsable. Aucun fichier producteur n’a été reconstruit ni modifié. Les snapshots et archives ont été lus comme fichiers ; les enveloppes n’ont jamais été analysées puis réémises avant vérification. Le vérificateur conserve les octets de la base publique `441598c279832b5521c952de920966a486d79026`.

Les racines consignées dans les observations publiques du producteur des 12, 14 et 19 octobre ont été fournies séparément. Les autres proviennent des noms de fichiers conservés adressés par empreinte. Ces deux méthodes restent des choix d’admission du producteur, sans autorité de confiance externe. La racine courante utilise aussi un registre d’intentions producteur distinct comme catalogue attendu. Les racines historiques n’ont pas de catalogue fourni séparément ; leurs 12 sélections proviennent de chaque inventaire vérifié. Un succès ne couvre pas des variantes non déclarées.

| Préfixe de racine | Statut | Archives | Sélections | Contrôles du snapshot |
|---|---|---:|---:|---:|
| `01aef227a841…` | PASS | 59 | 12 | 1768 |
| `0b0d2f7dbb8c…` | PASS | 59 | 12 | 1780 |
| `0b509da9c22f…` | PASS | 59 | 12 | 1772 |
| `2f21783cb93f…` | PASS | 59 | 12 | 1768 |
| `367be59f84d9…` | PASS | 59 | 12 | 1776 |
| `390877e028d0…` | PASS | 59 | 12 | 1772 |
| `5fbba12e5038…` | PASS | 59 | 12 | 1780 |
| `acf7bc3923f7…` | PASS | 59 | 12 | 1780 |
| `ad6ce4927a2a…` | PASS | 59 | 12 | 1768 |
| `beaeed142e9b…` | PASS | 59 | 12 | 1781 |
| `d5d52ed75360…` | PASS | 59 | 12 | 1780 |

## MCP et lifecycle

L’implémentation réelle conservée de l’adaptateur MCP a été exécutée localement avec une liaison fermée lisant seulement les actifs locaux. `server/discover` et 12 sélections exactes `get_context_pack` passent le lecteur actuel : 13 échanges, 12 opérations du résolveur local et zéro appel réseau. Les requêtes, octets des corps de réponse, en-têtes protocolaires, identifiants et types sont conservés en privé. Ce sont des corps Response produits en mémoire par l’implémentation locale, sans capture réseau ni exécution du Worker déployé complet. Le rejeu immédiat ne mesure ni latence hébergée ni découpage temporel original. Les contrôles SSE synthétiques du lecteur restent distincts.

Chaque artefact extrait correspond à son empreinte de transport déclarée et au `payloadDigest` canonique du pack sélectionné dans le snapshot admis. Le producteur sert le JSON canonique ; `payloadFileDigest` désigne les octets du fichier source, qui diffèrent. Le harnais sélectionne explicitement `canonical-json` et exige que les octets reçus soient déjà canoniques, sans les réécrire. `canonicalContentBound` vaut true et `fileBytesBound` vaut false. Aucune signature ou permission de production n’a été fabriquée.

Les actifs health/lifecycle conservés sont cohérents, avec une racine courante et 11 racines retenues. Sept contrôles locaux distinguent contradiction, conservation historique et transition indéterminée. `schemaVersion: 0.2.0` appartient précisément à l’objet `GovernedContextRuntimeHealth` conservé, sans renommer tous les schémas Runtime. Faute de captures hébergées horodatées, le comportement lifecycle pendant un déploiement reste NOT_RUN. Le relevé historique `initialize` HTTP 404 / JSON-RPC `-32601` est préservé.

Le brief rapporte six récupérations déclarées par un auditeur vers 15:37 à 15:50 UTC le 19 octobre. Aucun journal d’événements à l’origine avec identifiants de corrélation pour cette fenêtre n’était disponible dans la recherche locale bornée. La déclaration reste non réconciliée et ne prouve pas six événements à l’origine. Aucun événement brut, observation historique ou indicateur n’a été modifié ; aucune soustraction forfaitaire ni exclusion de fournisseur n’a été appliquée.

## Reproduire le parcours public

Le [harnais générique](../../scripts/qualify-offline.mjs) réutilise le vérificateur et l’inspecteur de packs, sans réseau ni dépendance d’exécution. Syntaxe : `node scripts/qualify-offline.mjs <config.json> <new-report.json>`. Les chemins sont relatifs au fichier de configuration ; le rapport doit être nouveau et hors du paquet. Le catalogue facultatif contient un tableau JSON, pas l’enveloppe entière du registre.

```json
{
  "snapshotPath": "snapshot.json",
  "archivesDirectory": "archives",
  "expectedRoot": "sha-256:<64 caractères hexadécimaux minuscules fournis séparément>",
  "rootProvenance": "Expliquer la source distincte de l’admission et ses limites",
  "selections": [{"intentToken": "<intention déclarée>", "lang": "fr", "version": "<version exacte>"}],
  "expectedIntentsPath": "expected-intents.json"
}
```

Les archives portent le nom `<empreinte-hexadécimale-64>.json`. Retirer `expectedIntentsPath` si aucun catalogue distinct n’existe ; le rapport le signale. Codes de sortie : PASS 0 ; FAIL du vérificateur ou de sélection 2 ; entrée absente ou inexploitable NOT_RUN 3 ; erreur de harnais ou d’environnement ERROR 4. Une archive absente ne déclenche aucune récupération. Le rapport conserve les empreintes d’entrée, compteurs, sélections exactes, identité du vérificateur, version Node et limites. Une exception inattendue ne devient pas un refus d’intégrité réussi.

`bindMcpPack(reply, input)` contrôle séparément empreinte d’enveloppe, racine, snapshot complet et sélection exacte. Son profil par défaut `repository-bytes` exige l’empreinte de fichier. Le choix explicite `artifactByteProfile: 'canonical-json'` exige des octets reçus déjà canoniques correspondant à l’empreinte canonique sélectionnée ; il rapporte séparément la correspondance aux octets du fichier. Aucun repli ne choisit un profil après un échec.

```powershell
node --test test/qualification.test.mjs
node scripts/qualify-offline.mjs --help
```

Les tests publics utilisent des octets fictifs. Reproduire la qualification réelle exige aussi l’accès autorisé par le responsable aux originaux conservés, racines, catalogue, révision et dépendances d’adaptateur, ainsi qu’aux harnais privés. Les empreintes publiques ne reconstruisent pas ce matériel. Les captures hébergées complètes, la fenêtre de déploiement stable et le journal événementiel manquants empêchent les conclusions correspondantes. Aucun accès au service, modèle externe ou juge distant n’a été exécuté dans cette qualification.
