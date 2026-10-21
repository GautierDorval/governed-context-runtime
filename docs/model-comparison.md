# Pilote sémantique à quatre conditions

Langue : français · [English](en/model-comparison.md)

**Statut : `NOT_RUN`.** Aucun appel de modèle, juge distant, réponse observée ou score n’est produit. Le protocole `four-condition-pilot-3` prépare une expérience sur sept cas d’un service fictif. Il conserve le témoin à information égale du [protocole antérieur](https://github.com/GautierDorval/governed-context-runtime/blob/441598c279832b5521c952de920966a486d79026/docs/model-comparison.md) ; celui-ci prévoyait 280 réponses, sans exécution. Le présent plan en prévoit 560 par configuration.

Le [plan versionné](../spec/examples/semantic-boundaries/experiment-plan.json), la [grille](../spec/examples/semantic-boundaries/judging-rubric.json) et la [carte de prose](../spec/examples/semantic-boundaries/prose-coverage.json) fixent les entrées, attentes, effectifs et limites. Ces documents ne sont pas transmis au modèle.

## Conditions et contrastes

| Condition | Entrée documentaire | Question permise |
|---|---|---|
| `pack` | Pack JSON complet FR ou EN existant | Présentation structurée du contexte |
| `exhaustive_text` | Texte existant contenant les 129 valeurs terminales | Effet de ces deux représentations précises à valeurs égales |
| `canonical_prose` | Fiche naturelle FR ou EN ajoutée | Comparaison pratique avec cette alternative documentaire |
| `no_documentation` | Bloc documentaire vide, mêmes faits de cas et question | Effet de la disponibilité des informations documentaires |

Comparer pack/texte exhaustif, pack/prose, puis chaque condition documentée à l’absence de documentation. La prose combine des différences de formulation, longueur, redondance, vocabulaire et métadonnées. Le bras sans document conserve les questions et codes de preuve anglais communs, y compris des indices de vocabulaire sur l’évaluation et le lieu documenté. Ces codes restent identiques en français. Le contraste mesure donc l’apport du document au-delà de ces indices communs, sans prétendre supprimer toute information sur le service. Aucun contraste ne prouve un effet propre à toute l’architecture Runtime ; soustraire plusieurs écarts ne fournit pas une décomposition causale exacte.

## Sources, couverture et longueurs

[content.json](../spec/examples/semantic-boundaries/content.json) demeure la source fictive. Les packs, textes exhaustifs et [comparison-map.json](../spec/examples/semantic-boundaries/comparison-map.json) sont inchangés. Le contrôle conserve les 129 valeurs, types, positions, références et métadonnées par langue. Cette égalité explicite n’implique pas une interprétation identique par un modèle.

Les [fiches FR](../spec/examples/semantic-boundaries/fr.canonical-prose.md) et [EN](../spec/examples/semantic-boundaries/en.canonical-prose.md) présentent naturellement les faits, conditions conjointes, exclusions, preuves, contradictions, limites d’action, priorité locale et références. Elles sont extérieures au bundle historique. Leur carte énumère chaque unité source, les regroupements et les omissions techniques : digests, profils d’unités, versions et doublons de projection ne sont pas tous transmis. La prose ne revendique donc pas l’égalité des 129 valeurs. Les tests vérifient les références et la couverture déclarée ; une lecture éditoriale reste nécessaire pour la fidélité du sens.

Les mesures historiques pack/texte restent dans `comparison-map.json` : FR 10 328/17 538 octets et 10 170/16 993 scalaires Unicode ; EN 9 956/16 392 octets et 9 955/16 391 scalaires. Mesures séparées de la prose :

| Langue | Octets UTF-8 | Scalaires Unicode | Jetons |
|---|---:|---:|---|
| FR | 3837 | 3695 | NOT_RUN |
| EN | 3426 | 3421 | NOT_RUN |

Aucun remplissage n’égalise les longueurs. Les jetons seront mesurés avec le jetoniseur effectivement choisi, avant les appels. Une configuration incapable de recevoir les entrées complètes s’arrête ; toute adaptation exige une nouvelle version du plan, sans troncature silencieuse.

La prose normative provient seulement de `content.json` ; les illustrations propres aux cas, dont Ontario, sont retirées. La décision et l’autorisation distinctes restent présentes parce que la source énonce elle-même cette règle. Les contrôles de couverture valident chemins et ancres des identifiants, pas le sens d’une réécriture après mise à jour des empreintes ; une revue éditoriale reste nécessaire.

## Entrées identiques hors document

Le modèle reçoit uniquement la consigne commune de sa langue, le document choisi entre les mêmes délimiteurs `<documentation>`, puis la question et les éléments du cas. Le bloc est vide dans `no_documentation`. Aucun identifiant de cas, classification, label de qualité, réponse illustrative, grille, carte de correspondance ou source cachée ne s’ajoute. L’[assembleur pur](../spec/examples/semantic-boundaries/assemble-prompt.mjs) ne transmet que les preuves du cas et sa question localisée, avec le document sélectionné. Ses tests vérifient les octets émis et l’absence de champs pédagogiques sentinelles. Chaque essai ouvre une conversation neuve, sans outils, navigation, récupération ni mémoire d’un essai précédent.

Consigne FR, figée dans le plan :

> Réponds à la question à partir des éléments du cas et de la documentation fournie, lorsqu’elle est présente. N’invente aucune règle propre au service. Conserve les conditions, exclusions et limites établies par les informations disponibles. Cite les références utiles lorsqu’elles sont fournies. Signale ce qui ne peut pas être conclu et les informations nécessaires pour le déterminer. N’exécute aucune action.

La consigne EN correspondante est figée dans le même plan. Le plafond est 512 jetons de réponse. Fournisseur, modèle, révision, client, jetoniseur, paramètres d’échantillonnage, graines, capacité de contexte et tarifs restent null. Une graine éventuelle ne garantit pas la répétabilité exacte.

## Budget, ordre et erreurs

`7 cas × 2 langues × 4 conditions × 10 répétitions = 560 réponses` attendues par configuration. Il y a 140 blocs de quatre conditions. Pour les indices de cas `c`, de langue `l` et de répétition `r` partant de zéro, faire une rotation gauche de `(c + 2*l + r) mod 4`. L’ordre des blocs cas/langue/répétition reste fixé. Chaque condition occupe chaque position 17 ou 18 fois par langue, 35 fois globalement et deux ou trois fois par sous-groupe de dix répétitions. Le cas modifie la rotation ; la répétition reste liée à un motif fixe modulo quatre. Ce n’est pas une affectation aléatoire et aucune graine n’est revendiquée.

Les identifiants d’essai opaques contiennent la configuration et un numéro séquentiel. Cas, langue, répétition, condition et position restent des métadonnées distinctes, hors de l’entrée du modèle. Une seule tentative technique supplémentaire est permise, après le passage prévu, pour un échec de transport ou une erreur transitoire explicite du fournisseur avant toute réponse terminée. Le plafond est donc 560 reprises, 1 120 tentatives au maximum par configuration. Garder la trace initiale et l’identifiant de l’essai parent. Les métadonnées d’une tentative combinent ce même identifiant et `attemptNumber: 1` pour la première tentative ou `2` pour l’unique reprise ; une reprise ne crée pas un nouvel essai prévu. Une réponse sémantique refusée ou insatisfaisante n’est jamais remplacée pour obtenir un meilleur résultat. La première réponse terminée est conservée, y compris une réponse vide ou tronquée à 512 jetons, sans reprise. Conserver les marqueurs et motifs de fin. Les règles `responseHandling` de la grille sont canoniques : appliquer d’abord la carte d’applicabilité du cas et de la condition. Une réponse terminée vide, ou composée uniquement d’espaces après `String.prototype.trim`, reçoit `UNSCORABLE` pour chaque dimension applicable et une utilité `UNDETERMINED`. Pour un texte tronqué non vide, une violation visible ou l’omission d’un élément exigé par un critère applicable reçoit `FAIL`. Un fragment ininterprétable reçoit `UNSCORABLE` seulement si aucun échec visible n’est établi ; `PASS` exige un texte assez interprétable pour établir le critère ; la seule absence d’une violation visible dans un fragment ininterprétable ne suffit pas. Par exemple, le fragment « Le projet est » ne permet pas de juger la justification d’une affirmation ; « Le lieu est indéterminé » le permet si l’entrée ne précise aucun lieu. U+200B n’est pas supprimé par `trim` ; ce caractère seul est non vide, mais ininterprétable, sans `PASS` automatique. Cette règle de réponse n’utilise pas les règles d’espacement du vérificateur. L’utilité suit les mêmes critères sur le contenu visible. Une réponse tronquée vide suit la règle du vide. Aucune continuation ni aucun crédit pour un contenu absent n’est supposé. Les appels de juges et leurs reprises demandent un budget distinct avant exécution.

## Juger selon l’information disponible

La grille fixe l’applicabilité par cas et condition avant observation. Elle conserve conditions, exclusions, extension de portée, explication/permission, refus injustifié, références, information manquante et contradiction. La justification des affirmations et la fabrication de références sont évaluées dans tous les bras. La conservation d’une règle ou référence absente est `NOT_APPLICABLE`, sans réussite facile ajoutée au dénominateur. Une référence inventée reste un défaut observable.

Pour les sept cas sans documentation : ne pas inventer les critères du service ; ne pas déduire une disponibilité canadienne d’un projet ontarien favorable ; laisser l’admissibilité inconnue sans confondre preuve absente et défavorable ; ne pas inventer le lieu ; respecter l’interdiction d’action sans déclarer des règles inconnues satisfaites ; conserver la contradiction Québec/Ontario ; reconnaître le résultat technique défavorable sans fabriquer une exclusion contractuelle. Les attentes détaillées et réponses pédagogiques documentées figurent dans la grille, hors entrée du modèle.

Deux sorties restent distinctes. **Justification** : chaque dimension applicable reçoit `PASS`, `FAIL` ou `UNSCORABLE`, avec motif et extrait disponible. Une affirmation exacte par hasard échoue si aucun élément reçu ne la justifie. **Utilité documentaire** : `RESOLVED`, `PARTIAL` ou `UNDETERMINED`, selon la même demande informationnelle propre au cas dans tous les bras. Une abstention peut être justifiée et peu utile. Sans réponse terminée, il n’y a ni étiquette de dimension ni jugement d’utilité, y compris aucun FAIL ou UNSCORABLE. Conserver séparément les tentatives techniques ; ces traces n’entrent pas dans les dénominateurs d’accord entre jugements appariés.

## Évaluateurs, aveugle et accord

Deux évaluateurs produiront des jugements initiaux conservés avant arbitrage. Leurs identités et rôles humains ou automatisés ne sont pas encore choisis. Ils connaissent le profil minimal documentation présente/absente, mais pas le label JSON/texte/prose. L’aveugle est partiel et une réponse peut révéler sa condition.

Calculer l’accord brut et le kappa nominal de Cohen sur les annotations initiales appariées : séparément pour `PASS`/`FAIL`/`UNSCORABLE` et pour les trois catégories d’utilité. Publier effectifs, tables croisées, marges, non-applicables et jugements manquants. Exclure les `NOT_APPLICABLE` suivant la grille ; exclure une paire incomplète du calcul sans effacer son manque.

```text
po = accords / jugements appariés applicables
pe = somme des produits des proportions marginales par catégorie
kappa = (po - pe) / (1 - pe)
```

Sans paire ou si `pe = 1`, kappa vaut null avec motif ; conserver l’accord brut lorsqu’il est calculable. Regrouper les dimensions par dimension/langue/condition, et l’utilité par cas/langue/condition, avec leurs effectifs. Aucun regroupement opportuniste après observation, seuil universel ou preuve de validité générale n’est déduit du coefficient. [Rétrospective de Cohen](https://garfield.library.upenn.edu/classics1986/A1986AXF2600001.pdf).

## Analyse, conservation et limites

L’analyse primaire est descriptive par cas, langue, condition et dimension : réponses attendues, tentées, reçues, évaluables, non évaluables, erreurs, désaccords et non-applicables. Conserver les écarts appariés par cas/langue/répétition/configuration. Comparer seulement des critères et dénominateurs compatibles ; présenter les mesures communes séparément de la conservation propre aux bras documentés. Aucun score global ou test inférentiel ajouté après lecture des résultats.

Dix répétitions ne créent pas 70 scénarios indépendants. Les deux langues ne créent pas deux domaines indépendants : il reste sept cas d’un service fictif. Un résultat nul ne prouve ni équivalence générale ni inutilité du Runtime. Le cas d’action mesure des formulations de permission, sans outil ni blocage réel de réservation, paiement ou travaux. À octets transmis identiques, le vérificateur en amont n’est pas un traitement visible du modèle ; admission, sélection, refus et traçabilité restent reliés aux tests techniques et à la trousse. Une future expérience complète conserverait aussi les refus et erreurs avant le modèle.

Avant l’expérience, figer révision, empreintes, configuration, ordre, budgets de juges et politique de conservation. Conserver requêtes sans secrets, réponses brutes, paramètres, jetons réellement observés, erreurs, jugements et arbitrages. Le plan garde les destinations de résultats null, `observedResponses: []` et `scores: null`. Aucun expéditeur d’API n’est ajouté. Les [tests de préparation](../test/pilot-plan.test.mjs) contrôlent les actifs, sans simuler des réponses de modèle.

Le chemin français historique `docs/model-comparison.md` est conservé pour les liens existants, avec sa langue et son équivalent anglais explicitement indiqués.
