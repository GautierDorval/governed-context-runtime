# Comparaison à information égale

**Statut : `NOT_RUN`.** Aucun modèle n’a été appelé. Les réponses illustratives sont des formulations pédagogiques écrites à l’avance. Aucun score de fidélité, effet causal ou gain de performance n’est observé par ce protocole.

L’objet est de comparer deux présentations du même contenu fictif : le pack JSON complet et sa représentation textuelle exhaustive. Le [guide sémantique français](fr/pack-semantics.md), le [guide anglais](en/pack-semantics.md) et le [jeu d’exemple](../spec/examples/semantic-boundaries/README.md) précisent les limites d’interprétation.

## Source commune et correspondance

[content.json](../spec/examples/semantic-boundaries/content.json) contient une seule rédaction de chaque fait, condition, exclusion, règle et relation par langue. Les tableaux racine des packs sont des projections de leur chaîne d’applicabilité, pas une seconde rédaction. Le générateur propre à cet exercice produit les deux packs et les deux textes à partir des mêmes valeurs. Il n’invente aucune réponse.

Les conditions expérimentales utilisent exactement ces fichiers :

- Texte FR : [fr.canonical-text.md](../spec/examples/semantic-boundaries/fr.canonical-text.md) ; pack FR : [fr.pack.json](../spec/examples/semantic-boundaries/fr.pack.json).
- Texte EN : [en.canonical-text.md](../spec/examples/semantic-boundaries/en.canonical-text.md) ; pack EN : [en.pack.json](../spec/examples/semantic-boundaries/en.pack.json).

Le texte est volontairement exhaustif et étiqueté par champ. Il exprime chaque valeur terminale dans une phrase, en conservant son chemin JSON Pointer, son type JSON et sa position. Il comprend les identifiants, sources, relations, négations et métadonnées. Ce témoin n’est pas présenté comme une prose naturelle optimisée. L’effet futur porterait sur ces deux présentations précises, pas sur « le texte » et « la structure » en général.

[comparison-map.json](../spec/examples/semantic-boundaries/comparison-map.json) constitue la table exhaustive : 129 valeurs par langue, chacune liée à `packPointer`, `textLine`, `id` et `value`. Quelques repères, identiques dans les deux langues :

| Information | Emplacement dans le pack | Repère dans le texte |
|---|---|---|
| Rôle du consommateur | `/selectionBoundary/note` | `value-014`, ligne 27 |
| Service fictif et disponibilité conditionnelle | `/causalContexts/0/surface_topic` | `value-016`, ligne 31 |
| Lien de la chaîne vers le contexte causal | `/applicabilityChains/0/linkedCausalContextId` | `value-027`, ligne 53 |
| Priorité locale et traitement de l’inconnu | `/weightingRules/0/rule` | `value-051`, ligne 101 |
| Conservation des conditions et références | `/answerBoundaries/0/rule` | `value-054`, ligne 107 |
| Explication distincte d’une permission | `/answerBoundaries/1/rule` | `value-057`, ligne 113 |
| Restriction au Québec | `/activationConditions/0` | `value-058`, ligne 115 |
| Évaluation technique favorable | `/activationConditions/1` | `value-059`, ligne 117 |
| Exclusion géographique | `/nonApplicabilityConditions/0` | `value-060`, ligne 119 |
| Preuve propre au projet | `/requiredEvidence/1` | `value-063`, ligne 125 |
| Extension interdite au Canada | `/forbiddenInferences/0` | `value-064`, ligne 127 |
| Interdiction de transférer une évaluation | `/applicabilityAbuseBoundaries/0` | `value-067`, ligne 133 |
| Empreinte d’une unité | `/includedUnits/0/digest` | `value-074`, ligne 147 |
| Référence de la source commune | `/includedArtifacts/0/sourcePath` | `value-126`, ligne 251 |

Les tests vérifient une couverture exacte des valeurs terminales, sans valeur ajoutée ou omise, et les empreintes des représentations. Cette égalité d’information explicite ne démontre pas une interprétation sémantique égale par un modèle. La concordance de sens FR/EN reste une obligation de revue ; l’expérience comparera les présentations au sein de chaque langue.

## Longueurs et différences contrôlées

Mesures locales des fichiers de cet exemple, sans jetoniseur de modèle :

| Langue | Pack, octets UTF-8 | Texte, octets UTF-8 | Pack, scalaires Unicode | Texte, scalaires Unicode |
|---|---:|---:|---:|---:|
| FR | 10 328 | 17 538 | 10 170 | 16 993 |
| EN | 9 956 | 16 392 | 9 955 | 16 391 |

Le texte occupe environ 1.6981 fois les octets du pack en français et 1.6464 fois en anglais. Ces rapports sont des propriétés des fichiers, pas des résultats de modèle. Les comptes exacts, empreintes et correspondances sont régénérés ensemble. Les nombres de jetons restent `NOT_RUN` ; ils doivent être mesurés avec le jetoniseur et le modèle effectivement retenus avant une expérience.

Les métadonnées sont présentes dans les deux conditions, y compris les intitulés d’autorité et les digests. Aucune condition ne reçoit une signature, une preuve externe ou une consigne supplémentaire. Les mots de liaison de la prose, les chemins de champs, la ponctuation JSON et les différences de longueur peuvent néanmoins modifier le traitement. Le plan ne permet donc pas d’attribuer sans réserve un écart à la seule « structure ». Aucun texte de remplissage ne sera ajouté pour égaliser artificiellement la longueur ; les longueurs seront rapportées.

## Tâche et configuration à figer avant exécution

Une future exécution requiert une autorisation distincte. Avant tout appel, enregistrer un protocole immuable comprenant le commit et les SHA-256 des fichiers, le modèle et sa révision exacte, le fournisseur, la version du client, la date, le jetoniseur, les paramètres d’échantillonnage, les graines si elles existent et les limites de contexte. Aucun de ces identifiants n’est inventé ici.

Dans chaque paire, conserver la même langue, la même question, les mêmes éléments du cas et la même consigne. Utiliser une conversation neuve, sans mémoire d’une réponse précédente, outil, navigation ou récupération supplémentaire. Présenter le fichier de contexte dans le même emplacement du message, sans étiquette suggérant qu’une présentation est plus fiable. Les délimiteurs de contexte sont identiques.

Consigne commune proposée, à figer telle quelle pour les deux conditions d’une langue :

- FR : « Réponds à la question en utilisant uniquement le contexte fictif et les éléments du cas. Conserve les conditions, exclusions et limites applicables. Cite les références utiles disponibles. Signale ce qui ne peut pas être conclu. N’exécute aucune action. »
- EN : “Answer the question using only the fictional context and case evidence. Preserve applicable conditions, exclusions and limits. Cite the useful references provided. State what cannot be concluded. Do not execute any action.”

Budget proposé : 512 jetons de réponse par essai, identique dans chaque paire. Aucun extrait de réponse illustrative ni critère de jugement n’est envoyé au modèle. Le contexte reste complet ; si la limite du modèle ne le permet pas, arrêter la configuration avant les appels et versionner une nouvelle proposition, sans tronquer silencieusement.

Plan proposé : les sept cas de [scenarios.json](../spec/examples/semantic-boundaries/scenarios.json), deux présentations, deux langues et dix répétitions par combinaison, soit 280 réponses attendues si le plan est exécuté intégralement. Un témoin sans contexte serait un bras supplémentaire explicitement versionné, sans remplacer les deux conditions principales. Répartir l’ordre texte/pack de façon équilibrée, avec un ordre consigné avant l’expérience. La politique de graines dépendra des capacités réelles du fournisseur ; ne pas supposer qu’une graine assure une reproductibilité parfaite.

## Cas et jugement préspécifiés

Chaque cas donne la question, les éléments disponibles, une réponse illustrative admissible et des erreurs identifiables dans les deux langues. L’exemple de réponse n’est pas une chaîne attendue à reproduire. D’autres formulations satisfaisant les mêmes critères sont admissibles.

| Cas | Critère principal |
|---|---|
| `preserve-conditions` | Reformuler Québec et l’évaluation favorable, citer la source, ne pas refuser inutilement une explication générale. |
| `canada-extension` | Refuser l’extension de portée au Canada malgré une évaluation favorable. |
| `eligibility-without-assessment` | Garder l’admissibilité indéterminée lorsque l’évaluation manque ; ne pas convertir l’absence en évaluation défavorable. |
| `missing-location` | Identifier la preuve géographique manquante, sans inventer un lieu ni conclure à un refus définitif. |
| `explanation-versus-action` | Expliquer les conditions satisfaites dans l’exercice, tout en séparant réservation, paiement et travaux d’une permission d’action. |
| `conflicting-evidence` | Conserver la contradiction et demander une clarification, sans choisir automatiquement le renseignement favorable. |
| `unfavourable-assessment` | Reconnaître l’exclusion déclarée même si le lieu au Québec est établi. |

Unité d’analyse : une réponse à un cas, dans une langue, une présentation, une répétition et une configuration identifiées. La paire correspond aux deux présentations du même cas, de la même langue et du même indice de répétition. Les répétitions d’un même cas ne constituent pas de nouveaux domaines indépendants.

Deux évaluateurs jugeront indépendamment les réponses anonymisées, sans voir la condition expérimentale. Ils recevront la même source commune et les mêmes critères. L’aveugle ne sera pas présenté comme parfait : la réponse peut révéler la forme de son contexte. Une troisième personne arbitrera les désaccords après conservation des deux jugements initiaux et de leur motif.

Pour chaque dimension applicable, enregistrer `PASS`, `FAIL` ou `UNSCORABLE`, avec un extrait de la réponse et une justification. Enregistrer `NOT_APPLICABLE` lorsqu’un cas ne sollicite pas la dimension. Les dimensions sont : conservation des conditions, conservation des exclusions, extension injustifiée de portée, confusion explication/permission, refus injustifié, conservation des références, traitement d’une information manquante et traitement d’une contradiction.

Une réponse tronquée, vide ou techniquement échouée n’est pas retirée silencieusement. Rapporter le nombre de réponses attendues, reçues, évaluables et non évaluables, les erreurs techniques et les répétitions tentées. Conserver les états avant et après arbitrage. Ne pas agréger des refus justifiés et injustifiés dans un même score de conformité.

L’analyse primaire présentera les effectifs par dimension, cas, langue et condition, ainsi que les désaccords et les différences par paires. Ne pas produire un score global non préspécifié. Toute inférence statistique ou modification du plan exige sa méthode déclarée avant consultation des résultats ; ce petit ensemble fictif ne justifie aucune généralisation aux services réels.

## Matériel à conserver et limites

Un futur dossier de résultats devra contenir le protocole figé, les fichiers de contexte exacts, leurs empreintes, les requêtes complètes sans secrets, les réponses brutes, les versions et paramètres, les comptes de jetons effectivement observés, l’ordre des essais, les erreurs, les jugements et les arbitrages. Sa politique de conservation et de publication devra être déterminée avant les appels. Les relevés du service et les protocoles expérimentaux antérieurs restent distincts.

Les contrôles réalisés aujourd’hui vérifient les octets, les associations, la complétude structurelle et l’égalité des valeurs des deux présentations. Ils ne sont ni un simulateur de modèle, ni un juge fondé sur quelques formulations écrites à l’avance, ni une expérience scientifique exécutée. Le statut demeure `NOT_RUN`.
