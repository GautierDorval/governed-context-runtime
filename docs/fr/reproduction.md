# Reproduire le consommateur fictif hors ligne

Le kit sélectionne un pack complet, vérifie le reçu de test historique et l’instantané
complet, puis remet le contenu admis à un consommateur local fictif. Il réutilise
`inspectVerifiedPack`, comme l’[exemple sémantique](pack-semantics.md). Il ne produit
aucune réponse de modèle et ne contacte aucun service. Le bundle, la racine et le
reçu historiques sont conservés. Node.js 24.17.0 ou ultérieur est requis ; la version
24.17.0 correspond à la CI. Ce parcours et `npm test` ne demandent aucune installation.

Depuis la racine du clone public choisi :

```powershell
git rev-parse HEAD
node --version
node spec/examples/reproduction/run.mjs --help
node spec/examples/reproduction/run.mjs --policy spec/examples/reproduction/policy.json --lang fr --intent representation-gap --version fictional-1
node spec/examples/reproduction/run.mjs --policy spec/examples/reproduction/policy.json --suite
```

La commande lit des fichiers locaux et écrit du JSON sur la sortie standard, sans
créer de fichier. Le code 0 indique un cas admis ou une suite conforme à ses attentes ;
2 indique un cas refusé ou un usage invalide ; 1 indique une erreur inattendue ou
une suite en échec. Pour enregistrer une capture hors du clone, ajouter par exemple
`> "$env:TEMP/gcr-reproduction.json"`. La suite utilise ses sélections fixes ; les
options de sélection concernent un cas seul. `--case` choisit une ligne de
[cases.json](../../spec/examples/reproduction/cases.json).

La politique séparément fournie est un choix de confiance pédagogique explicite.
Sa racine, sa clé et son horloge fixe accompagnent l’exercice, sans acquisition
indépendante de confiance de production. Le bundle entrant ne choisit jamais la
racine admise. `policyDigest` identifie la configuration complète d’évaluation,
`now` inclus ; `artifactDigest` identifie l’enveloppe du reçu, pas tout le corpus.
Signature, intégrité de l’instantané et permission locale sont des étapes distinctes.
La finalité reste `inspect-context`, sans exécution d’action. Chaque nouvelle
opération fournit le reçu original et une politique actualisée. Le code hors ligne
ne découvre aucune compromission ultérieure et ne révoque pas rétroactivement une
opération admise sous une politique précédente.

Le résultat utile regroupe `content.pack`, `content.manifest`, `content.units`,
les octets sources de `content.sources` (base64, chemins et empreintes), la portée
et les liens de décision. Les sources proviennent des copies privées vérifiées.
Aucune URL canonique ni aucun identifiant de schéma n’est suivi. La sélection est
exacte, sans repli de langue, d’intention ou de version. La trace
`CONTENT_DELIVERED_TO_FICTIONAL_CONSUMER` constate une remise locale, pas une compréhension.

## Cas et couverture existante

[cases.json](../../spec/examples/reproduction/cases.json) fixe les attentes :
cas nominaux FR/EN, mauvaise racine, signature altérée, algorithme non admis,
archive absente ou altérée, intention/langue/version absente, clé ou finalité non
permise, expiration, révocation et mutation du tampon appelant. Tout cas négatif
exige zéro appel au consommateur. Le témoin `historical-v0` montre en plus que des
champs exclus du digest isolé peuvent changer sans le modifier, mais que la racine
de l’inventaire complet initial refuse leur substitution. Un corpus nouvellement
cohérent exige une autre admission de racine et ne prouve toujours pas la vérité.

`spec/examples/test-verified-pack.mjs` couvre la capture pendant une attente
contrôlée, le désaccord pack/registre sous racine recalculée, une nouvelle décision
après révocation et le refus d’une décision antérieure présentée comme reçu.
`spec/reference/test-consumer.mjs` couvre déjà la politique invalide avant l’accès
à l’artefact, les accesseurs de signataire, la priorité des erreurs et la séparation
historique/courant. `spec/examples/test-verified-unit.mjs` couvre l’appartenance
complète et la portée effective v0. Le [lecteur MCP](../../spec/examples/read-mcp-response.mjs)
est testé séparément avec des échanges JSON/SSE fictifs ; le kit lit des fichiers locaux.

## Identité et exécution extérieure

[manifest.json](../../spec/examples/reproduction/manifest.json) énumère fichiers,
tailles, SHA-256 et profils. La commande les contrôle avant les cas ; `kitDigest`
identifie ce manifeste. Ce n’est ni une signature, ni une preuve d’auteur ou de vérité.
Le manifeste cite le commit de référence initial, sans incorporer le SHA du commit
qui le contient. Consigner le SHA final obtenu par `git rev-parse HEAD` et le digest
du kit dans le rapport. Après une modification revue, le mainteneur lance
`node spec/examples/reproduction/build-manifest.mjs`, puis régénère le paquet.
La vérification ne répare jamais le manifeste.

Le [modèle de rapport](../../spec/examples/reproduction/report-template.json) est
préparé pour une future personne extérieure. Celle-ci choisit un environnement
propre et un commit public exact, suit les seules instructions publiques et consigne
date UTC, environnement, rôle et relation déclarés avec le producteur, commandes,
codes de sortie, cas, captures, divergences et limites. Aucun identifiant personnel
superflu n’est requis. Conserver les désaccords et cas `NOT_RUN`. Le présent mandat
prépare ce protocole sans contacter de tiers ni effectuer cet envoi.

`PREPARED` signifie que le protocole existe. `PRODUCER_REPRODUCED` décrit une
exécution locale du producteur. Un rapport extérieur reçu devient
`EXTERNAL_RUN_REPORTED` ; seul le contrôle de ses preuves peut soutenir
`EXTERNAL_REPRODUCTION_VERIFIED`, borné aux cas exécutés. La reproduction extérieure
reste `NOT_RUN` tant qu’aucun rapport n’existe. Réutiliser ce vérificateur démontre
la reproductibilité, pas une réimplémentation cryptographique indépendante. Le client
Python écrit séparément et déjà testé par le producteur en boucle locale conserve
son acquis d’implémentation distincte ; aucun script privé n’est exporté et aucune
indépendance organisationnelle n’en est déduite.

## Coût et limites

`node spec/examples/reproduction/benchmark.mjs` mesure les étapes locales avec une
horloge monotone, 5 échauffements et 40 échantillons, valeurs brutes, médiane et p95.
Le chargement de fichiers reste séparé. `--baseline <export-local>` compare l’ancien
parcours reçu/instantané sur les mêmes octets. Aucun consommateur complet antérieur
n’existait ; son nouveau coût est présenté séparément. Ces observations ne prédisent
ni la latence hébergée ni celle d’un agent et ne fixent aucun seuil universel.

L’exercice ne prouve ni production actuelle, ni provenance du build, ni révocation
en temps réel, ni compatibilité d’assistant, ni indépendance organisationnelle,
ni bénéfice sémantique. Le [protocole comparatif](../model-comparison.md) reste
`NOT_RUN`. Seule la qualification de développement demande `npm ci --ignore-scripts`
puis `npm run test:dev` ; les schémas sont résolus localement.


## Sélection d’un cas et erreurs d’entrée

Pour un cas nominal unique, le cas par défaut suit `--lang en|fr`. Les identifiants
explicites `nominal-en` et `nominal-fr` exigent la langue correspondante ;
des options contradictoires sont refusées avec `case_language_mismatch`. Le cas
fixe `wrong-language` reproduit le refus d’une langue non déclarée après la
vérification complète. Dans la bibliothèque, les types d’entrée mal formés et les
objets non copiables rejettent la promesse ; les refus du domaine retournent
`REFUSED`. La commande intercepte les deux issues et ne transmet aucun contenu en
cas d’échec. Voir le [contrat d’entrée](../verification.md).


## Préversion de référence et qualification

La préversion de référence `0.2.1-proposed` est identifiée par son étiquette distante et sa release GitHub. Citer cette étiquette et le commit exact exécuté ; `v0.2.0-proposed` conserve ses octets historiques. La [qualification hors ligne](qualification.md), le [pilote à quatre conditions, NOT_RUN](../model-comparison.md) et les [notes de version](../release-0.2.1-proposed.md) ont des portées distinctes. La trousse fictive signée reste distincte de l’exemple sémantique non signé.
