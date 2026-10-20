# Sémantique d’un pack vérifié

[English](../en/pack-semantics.md) · [Schémas](../schemas.md) · [Contrat de vérification](../verification.md) · [Exemple complet](../../spec/examples/semantic-boundaries/README.md)

Un pack transporte des déclarations, des relations et des références. Le schéma décrit leur forme. La vérification établit leur intégrité et certaines associations sous la racine choisie. Le consommateur doit encore établir les faits propres au cas, interpréter les conditions et décider d’un usage dans son périmètre. Aucune de ces étapes ne démontre que les déclarations sont vraies ou qu’un modèle les respectera.

Trois états restent distincts :

1. **Déclaration** : « une évaluation technique favorable est nécessaire » figure dans le pack.
2. **Satisfaction documentée** : des éléments propres au projet permettent, ou non, d’établir cette condition. L’absence d’élément n’est ni une évaluation favorable ni une évaluation défavorable.
3. **Décision du consommateur** : celui-ci accepte un usage local défini. L’explication d’une condition ne constitue pas une autorisation de réserver, de payer ou d’exécuter des travaux.

Les emplacements ci-dessous suivent [le schéma complet du pack](../../spec/context-pack.schema.json). Les tableaux racine et les tableaux d’une chaîne sont des champs distincts. Le schéma n’impose pas leur équivalence ; dans l’exemple, ils dérivent des mêmes entrées et un test vérifie leur concordance.

## Conditions et éléments nécessaires

### `activationConditions`

Emplacements : `$.activationConditions` et `$.applicabilityChains[*].activationConditions`. Ces listes déclarent les conditions d’application. Exemple : le projet se situe au Québec et dispose d’une évaluation technique favorable. Elles diffèrent des preuves, qui servent à établir ces conditions.

Le schéma contrôle des chaînes de caractères non vides ; la liste imbriquée doit contenir au moins un élément. Le snapshot lie les déclarations. Le vérificateur ne contrôle pas le lieu réel du projet et n’exécute pas une logique générale de conditions. Le consommateur doit déterminer les éléments pertinents et la règle de combinaison. L’exemple précise une conjonction des deux conditions comme convention pédagogique locale.

### `nonApplicabilityConditions`

Emplacements : `$.nonApplicabilityConditions` et `$.applicabilityChains[*].nonApplicabilityConditions`. Elles déclarent des situations exclues, par exemple un projet hors Québec ou une évaluation défavorable. Une preuve absente n’est pas automatiquement une exclusion satisfaite.

La structure et l’intégrité sont contrôlées, pas la réalisation des exclusions. Le consommateur doit distinguer exclusion établie, condition inconnue et contradiction. Le contrat général ne définit pas un calcul universel de négation, de priorité ou de conflit.

### `requiredEvidence`

Emplacements : `$.requiredEvidence` et `$.applicabilityChains[*].requiredEvidence`. Le champ décrit les éléments nécessaires : preuve du lieu et compte rendu daté d’une évaluation favorable propre au même projet. Il ne contient pas ces pièces et ne certifie pas leur authenticité.

Le vérificateur lie la liste comme contenu ; il ne collecte, ne date et ne juge aucune pièce externe. Le consommateur doit obtenir les éléments autorisés, vérifier leur pertinence et conserver les inconnues. Les références ne valent pas preuve de disponibilité d’un document.

## Limites d’inférence et de réponse

### `forbiddenInferences`

Emplacements : `$.forbiddenInferences` et `$.applicabilityChains[*].forbiddenInferences`. La liste interdit des conclusions dépassant la portée déclarée : « Québec » ne permet pas de conclure « tout le Canada », et la description d’un service n’établit pas l’admissibilité d’un projet.

Le contrôle porte sur la présence structurelle et l’intégrité de cette déclaration. Le Runtime ne lit pas une réponse de modèle pour y détecter une inférence interdite. Une évaluation sémantique serait un travail distinct ; le [protocole de comparaison](../model-comparison.md) est `NOT_RUN`.

### `applicabilityAbuseBoundaries`

Emplacements : `$.applicabilityAbuseBoundaries` et `$.applicabilityChains[*].applicabilityAbuseBoundaries`. Ces limites portent sur les élargissements d’application ou d’autorité : transférer une évaluation d’un projet à un autre, ou élever une priorité documentaire locale au rang d’autorité universelle.

Elles se distinguent des exclusions du cas et des conclusions interdites, même si leurs effets peuvent se recouper. Le vérificateur ne décide pas si un usage constitue cet élargissement. Le consommateur doit préserver la portée du cas et de la source.

### `answerBoundaries`

Emplacement : `$.answerBoundaries[*]`, objet `ruleRef` comportant `ruleId`, `sourceArtifact` et `rule`. Exemple : conserver Québec et l’évaluation favorable, signaler une preuve manquante et séparer l’explication d’une permission d’action.

Le schéma exige les trois membres. Le vérificateur construit le nœud correspondant et exige la source locale désignée par `sourceArtifact`. L’existence d’une source n’établit pas, à elle seule, qu’elle justifie sémantiquement la règle. L’exemple dérive le texte de la règle de sa source unique ; ses tests vérifient la correspondance. Le consommateur reste responsable de la restitution et de ses limites.

### `weightingRules`

Emplacement : `$.weightingRules[*]`, également `ruleRef`. Une priorité locale explique quel élément doit primer dans le cadre déclaré. Dans l’exercice, les restrictions explicites priment sur une reformulation promotionnelle, et une contradiction appelle une clarification.

Le graphe, la référence locale et les octets sont vérifiés. Il n’existe ici ni score de classement, ni moteur universel de résolution des conflits, ni permission déduite d’une priorité. Le consommateur doit justifier l’arbitrage qu’il applique. L’exemple ne transforme pas sa convention en norme générale du Runtime.

## Situations et relations

### `causalContexts`

Emplacement : `$.causalContexts[*]`. Chaque contexte comporte `id`, `surface_topic`, `trigger`, `risk`, `latent_need`, `intended_consequence` et `forbidden_derivations` ; `symptom` et `canonical_surfaces` sont facultatifs. L’exemple relie une question sur la disponibilité au risque de promettre une prise en charge sans conserver ses conditions.

Un contexte causal explique la motivation des limites. Il ne constitue pas une démonstration empirique de causalité. Le schéma exige l’objet complet. Le vérificateur reconstruit son nœud et son identité, sans valider le raisonnement. `canonical_surfaces` reste une déclaration ; le parcours ne visite aucune URL.

### `applicabilityChains`

Emplacement : `$.applicabilityChains[*]`. L’objet relie une situation à un contexte causal via `linkedCausalContextId`, à une capacité via `applicableCapability`, puis à ses conditions, éléments nécessaires, exclusions et limites. Il comprend aussi `triggerSituation`, `latentNeed`, `riskClass`, `domain` et `status`.

La capacité possède `id`, les deux `canonicalServiceUrlFr`/`canonicalServiceUrlEn` et les deux `labelFr`/`labelEn`. Dans l’exemple, ses URL `example.invalid` identifient une fiction ; elles ne sont pas récupérées. La chaîne `project-assessment-chain` pointe vers `quebec-conditional-service`.

Le schéma contrôle l’objet complet. Le vérificateur impose un lien vers un contexte causal présent dans le même pack et compare le graphe reconstruit à l’inventaire. Il ne prouve ni que la capacité existe réellement ni que ses conditions sont satisfaites. Les dépendances implémentées sont bornées ; il ne s’agit pas d’un raisonneur causal général.

## Sources, unités et sélection

### `includedUnits`

Emplacement : `$.includedUnits[*]`, références comprenant `unitId`, `sourcePath`, `canonicalSource`, `claimClass`, `authorityScope` et `digest`, avec portée/profil facultatifs dans le schéma. Le vérificateur retrouve l’enregistrement complet, compare les membres de la référence et recalcule le digest de l’unité selon son profil.

Les quatorze unités de l’exercice utilisent `selected_unit_only` avec `deterministic-json-sort-keys-v0`. Leur digest porte sur le tableau sélectionné dans la source, pas directement sur les champs du registre. Le snapshot complet lie aussi ces champs. Dans l’ancien profil d’enveloppe v0, seuls sept champs participent à la préimage, et non la valeur sélectionnée ni les transformations : voir le [contrat de vérification](../verification.md). Une attestation d’intégrité n’est ni une preuve de vérité ni une permission.

### `includedArtifacts`

Emplacement : `$.includedArtifacts[*]`. Chaque référence contient `path`, `sourcePath` et `digest`, avec `digestScope` facultatif dans le schéma mais imposé à `complete_artifact` par le vérificateur. L’exemple inclut `content.json`, source lisible unique des faits et relations FR/EN.

Le profil historique de l’artefact dépend de son extension : JSON déterministe pour `.json`/`.jsonld`, texte normalisé selon la recette historique sinon. Ce digest ne doit pas être confondu avec le digest des octets sources, le digest de l’enveloppe d’archive ou la racine du corpus. Le snapshot complet vérifie ces couches et les associations. Le consommateur doit encore décider de la pertinence de la source et de son usage.

### `selectionBoundary`

Emplacement : `$.selectionBoundary`. Les constantes déclarent `agentSelectedIntent: true`, et `runtimeSelectedIntentFromFreeText`, `runtimeComposedAtRequestTime`, `runtimeProducedAnswer: false`, avec une `note` explicative.

Le consommateur choisit une intention fermée, une langue et une version exactes. Il vérifie le snapshot sous une racine fournie séparément, puis extrait le pack des archives déjà vérifiées. Aucun repli vers une version ou une langue approximative n’est permis par cet exemple. Ces constantes décrivent le contrat ; des octets identiques ne démontrent pas à eux seuls comment un serveur les aurait produits.

## Rejouer le parcours

Depuis la racine du clone, avec Node.js compatible avec `package.json` :

```powershell
node spec/examples/semantic-boundaries/demo.mjs fr
node spec/examples/semantic-boundaries/demo.mjs en
node --test test/semantic-boundaries.test.mjs
node --test test/semantic-boundaries-schemas.test.mjs
```

Les tests de schéma utilisent les dépendances de développement verrouillées. La démonstration et les autres tests fonctionnent avec Node seul. La sortie expose le pack, le manifeste, les unités, les sources et les limites : `signatureTrust: not-established`, `usePermission: not-evaluated`, `modelExperiment: NOT_RUN`. La racine dans [expected-root.json](../../spec/examples/semantic-boundaries/expected-root.json) est un ancrage pédagogique séparé du bundle, livré par le même producteur ; elle n’est pas une confiance indépendante.
