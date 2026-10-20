# Contrats descriptifs des observations

Les trois relevés historiques du producteur restent inchangés octet pour octet. Ces contrats décrivent leurs formes publiées et certaines relations internes. Ils n’authentifient pas le producteur, ne reconstruisent pas les corps de réponse, ne répètent aucun contrôle réseau et ne constituent pas une attestation indépendante de déploiement.

## Catalogue local

Les identifiants sont des URN opaques, sans téléchargement. Ce catalogue reste distinct des quatre schémas historiques Runtime et ne modifie pas `SCHEMA_EDITION`.

| Forme | Identifiant | Fichier local |
|---|---|---|
| 12 octobre, `runtime-public-observation/1` | `urn:governed-context-runtime:evidence:runtime-public-observation:1` | [Schéma des requêtes](../../spec/evidence/runtime-public-observation-v1.schema.json) |
| 14 et 19 octobre, `runtime-public-deployment-observation/1` | `urn:governed-context-runtime:evidence:runtime-public-deployment-observation:1` | [Schéma de déploiement](../../spec/evidence/runtime-public-deployment-observation-v1.schema.json) |

Le second schéma accepte exactement une des variantes fermées `captureAndReadbacks` et `applicationAndSmoke`. Aucun champ n’est ajouté aux anciens relevés. Étiquettes inconnues, champs requis absents, variantes mélangées et membres supplémentaires sont refusés. Un format incompatible exige une nouvelle version. Les statuts `PASS` et `FAIL` restent des déclarations du producteur.

Le [catalogue de tests](../../test/observation-schemas.test.mjs) enregistre les deux schémas dans AJV 2020 avec `strict: true` et `validateFormats: true`. Les références `$defs` sont internes, sans chargeur asynchrone ni résolution réseau. Les formats `observation-utc` et `observation-date` utilisent les [fonctions locales](../../spec/evidence/observations.mjs), sans se fier à une annotation `date-time`. Une référence hors catalogue échoue à la compilation.

Depuis la racine du clone, après installation des dépendances de développement verrouillées :

```powershell
node --test test/observation-schemas.test.mjs
npm run test:dev
```

`npm test` et les démonstrations restent exécutables avec Node seul. AJV est une dépendance de développement. La fonction sémantique utilise les primitives JavaScript, reçoit un objet analysé et ne fait aucune entrée-sortie. Valider d’abord le schéma correspondant : `checkObservationSemantics` renvoie `structuralValidationPerformed: false` et ne remplace pas cette validation.

## Profil de dates accepté

Le format est exactement `YYYY-MM-DDTHH:mm:ss[.fraction](Z|+00:00)` : années de 0001 à 9999, calendrier grégorien, heures de 00 à 23, minutes et secondes de 00 à 59, fraction facultative de 1 à 9 chiffres. `Z` majuscule et `+00:00` désignent UTC. Le calcul des années bissextiles inclut les exceptions des siècles et des multiples de 400. Une date seule utilise `YYYY-MM-DD` avec le même calendrier.

Dates impossibles, année zéro, secondes intercalaires, autres décalages (y compris `-00:00`), séparateurs minuscules, espaces et fractions trop longues sont refusés. C’est un profil local borné, sans prétention à couvrir entièrement RFC 3339. L’écriture historique des dates reste intacte. La comparaison en nanosecondes entières conserve les fractions de six ou sept chiffres sans arrondi à la milliseconde. Cette précision ne prouve ni l’exactitude ni l’indépendance de l’horloge.

## Séquences, comptes et identités

| Relevé | Intervalles | Arithmétique et racines |
|---|---|---|
| [12 octobre](../../evidence/instance-2026-10-12.json) | Début avant fin ; captures listées ordonnées et contenues dans cet intervalle. La réconciliation ultérieure possède une date, sans fenêtre de capture inventée. | `15 + 4 + 1 = 20` concerne les tentatives de clôture Node, PowerShell et HEAD échoué. Les huit requêtes listées forment une autre population. Les racines non nulles et `sameRoot` correspondent à la racine principale déclarée. |
| [14 octobre](../../evidence/instance-2026-10-14.json) | Capture principale, relecture de suivi et relecture déclarative ont chacune leurs bornes. Le suivi se termine à `lastPowerShellResponseAt`. Les deux suppléments sont postérieurs à la capture principale, sans la réécrire ni y être contenus. | Le nombre de racines distinctes ne dépasse pas celui des entrées vérifiées : dix entrées pour neuf racines sont valides. La racine déclarative correspond à la racine principale. Aucun total commun n’est imposé aux populations de requêtes, fichiers ou contrôles Python. |
| [19 octobre](../../evidence/instance-2026-10-19.json) | Preuve d’application et contrôle Runtime sont ordonnés et contenus dans la fenêtre générale. Aucun horodatage absent n’est inventé. | `282 routes × 2 surfaces = 564 réponses` ; `564 + 1 health + 6 MCP + 5 comparaisons directes = 576 requêtes applicatives`. La liste des outils correspond à `toolsListed`. Seuls les quatre artefacts MCP explicitement courants doivent partager la racine courante ; le pack historique conserve la sienne. |

Les comptes sont des entiers sûrs non négatifs. Un membre absent est refusé, jamais remplacé par zéro. Les 156 ressources indexées le 19 octobre ne forment pas un total de requêtes : les multiplier par GET/HEAD ou les ajouter à 576 inventerait un compte. Ces comptes ne mesurent ni adoption, personnes, organisations indépendantes ou appels de modèles.

Un `PASS` déclaré est refusé en cas de contradiction visible : requête autre que 200 le 12 octobre, déclarations de racine ou de schéma fausses dans le suivi du 14, code de sortie non nul ou différences candidates non vides le 19. Le contrôle ne recalcule pas chaque affirmation de prose et n’infère pas une réussite absente.

## Portée du résultat

`declaredStatus` est copié du relevé. `consistency` vaut séparément `CONSISTENT` ou `INCONSISTENT` pour les relations énumérées, avec chemins et codes de diagnostic. Un `FAIL` peut être cohérent ; un `PASS` valide selon le schéma peut être incohérent. Ni le schéma ni la cohérence locale ne prouvent que les échanges ont eu lieu.

Les trois relevés déclarent `rawResponsesPublished: false` et `modelInvocation: false`, obligatoires pour ce profil historique. Un futur relevé avec corps publiés exige un contrat adapté. Les empreintes identifient des captures conservées sans les reconstruire. Le contrôle renvoie donc `responseBodiesRechecked: false` et `hostedObservationRepeated: false`. Une déclaration de commit ne devient pas un déploiement vérifié ; une implémentation Python distincte ne devient pas une organisation indépendante ; une racine historique ne devient pas courante.

Les contrôles négatifs couvrent membres absents, variantes mélangées ou inconnues, empreintes, comptes et dates invalides, intervalles impossibles ou déplacés, inversions sous la milliseconde, totaux incohérents, ordre des requêtes, racines courantes contradictoires et succès déclarés contradictoires. Les gardes SHA-256 préservent les données historiques.

La [qualification locale du 20 octobre](qualification.md) ajoute un relevé séparé, sans faire entrer ses nouvelles formes dans ces deux schémas historiques.

[English](../observations.md) · [Diagnostic hébergé](hosted-diagnostics.md) · [Preuves](../../evidence/README.md)
