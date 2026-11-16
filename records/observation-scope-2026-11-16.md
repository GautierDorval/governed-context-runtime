# Périmètre d’observation du GCR, 16 novembre 2026

Compte rendu de Codex. Lot documentaire local, sans publication. Base examinée :
`48a5aac1ec40c2e3a7a4998a0fbbb51889042738`. Les preuves historiques restent
intactes. Ce contrôle n’est ni une nouvelle campagne ni une attestation indépendante.

**Conclusion.** Le résolveur de contexte et son adaptateur MCP n’appellent aucun
modèle. Ils peuvent constater un échange et rattacher les artefacts servis à leurs
identités techniques. L’observation de l’inférence revient au harnais qui appelle
le fournisseur. Le moteur de pilote présent dans ce dépôt remplit cette seconde
fonction séparément et conserve déjà les champs nécessaires. Aucun changement de
code, de schéma de reçu ou d’identifiant de session n’est justifié par ce contrôle.

**English summary.** Context delivery, consumer admission and provider execution
have distinct evidence. The hosted resolver does not observe the consuming model.
The separate pilot runner preserves requested configuration and provider-returned
metadata without independently attesting model weights or hidden routing. A retained
provider result is `RUN` / `COMPLETED`; the frozen public plan remains `NOT_RUN`.
Neither completion nor matching model labels establishes fidelity. Website
synchronization remains pending; this local review publishes no private response.

## 1. Mandat, ancrage et préservation

Mandat fourni : `03_governed-context-runtime_perimetre-observation.md`, daté du
16 novembre 2026, SHA-256
`86e6e66fb6705b0c331e9177f5b3cbb7561f42375811c7f7683e3a58ab9daebc`.

- Racine : `C:/Users/GautierDorval/Documents/GitHub/governed-context-runtime`.
- Remote confirmé : `https://github.com/GautierDorval/governed-context-runtime.git`.
  Le connecteur GitHub confirme la visibilité publique. `main` distant et local
  valent tous deux le SHA de base ci-dessus, vérifié par `git ls-remote`.
- Branche de travail locale : `codex/observation-scope-20261116`.
- Aucun changement suivi ni index préparé au départ. Le fichier préexistant
  `.claude/settings.local.json` est préservé, SHA-256
  `8585b028de11493c8a3d0bfc23e67c8007aae60a2bc7c6d753c2b7200776c0cd`.
  Sa visibilité dans `git status` dépend de l’accès au fichier global d’exclusion.
- Aucun `AGENTS.md` ou `CLAUDE.md` trouvé dans la référence GCR. Les instructions
  fournies dans la session s’appliquent. Lease propre acquis avant modification.
- Les autres dépôts restent en lecture seule. Leurs checkouts portent du travail
  préexistant : les lectures de code utilisent des objets Git explicitement nommés,
  sans checkout, build, test, régénération ou mise à jour de ces dépôts.
- Aucun push, PR, merge, déploiement, appel de modèle, reprise de campagne,
  collecte manuelle ou accès à un site client. Aucun secret ou corps fournisseur
  n’est copié dans ce rapport. Le mandat courant ne renouvelle aucun ancien GO.

Instructions réellement consultées dans `pagup-internal-docs`, révision locale
disponible `830685ddb38d1ee04ff382d35ccf8fd68d4ae5ee` : `AGENTS.md`,
`tooling-readiness-p0-protocol.md`, `brief-handoff-lifecycle-protocol.md`,
`research-lab-navigation-boundary.md` et son registre d’hôtes,
`repo-update-p0-protocol.md`, `workstation-storage-policy.md` ;
sections pertinentes de `codex-claude-operating-protocol.md`,
`repository-workspace-lifecycle-protocol.md`, `visual-regression-protocol.md` et
`project-deadlines-outlook-protocol.md`. La carte du disque froid a été lue.
Aucune nouvelle échéance propriétaire n’a été créée. `MAINTAINING.md`, les
instructions des deux dépôts producteurs/consommateurs qui en possèdent et la
procédure Observatoire `docs/operations/live-verification.md` ont aussi été lus.

Le doctor canonique a été exécuté sans smoke live : Node/dev prêt, verdict global
1 lié à d’autres capacités et aux accès limités du compte sandbox. Les lectures
Git ayant rencontré `dubious ownership` ont été reprises avec `safe.directory`
limité à la commande. La revue mensuelle n’est pas due (`CheckDue` : 22 novembre).
Aucune indisponibilité globale d’outil n’est déduite de ces erreurs.

## 2. Environnements et relations

| Surface | Référence constatée | Relation et limite |
| --- | --- | --- |
| Référence publique | `GautierDorval/governed-context-runtime`, base `48a5aac1` | Contrats, vérificateurs, exemples et moteur de pilote optionnel. Ce dépôt n’est pas le code du service de packs hébergé. |
| Instance HTTP | `context.gautierdorval.com`, Worker `gautierdorval-context-runtime` | Source dans `GautierDorval/gautierdorval-governance-files` : `runtime-worker/wrangler.jsonc` et `runtime-worker/src/index.ts` au commit `91c414bea471edfc3009d0087a9aff8426fb16fd`. Configuration et annotation de déploiement concordent sur ce rattachement. |
| Adaptateur MCP | Worker `gautierdorval-context-mcp`, route `/mcp*` | Même dépôt et commit : `mcp-worker/wrangler.jsonc`, `src/production.mjs`, `src/index.mjs`. Liaison `RUNTIME_RESOLVER` vers le résolveur. Aucun appel d’inférence dans ce chemin. |
| Agrégats Runtime | Worker `gautierdorval-runtime-ledger` | Même dépôt producteur, contrat source `1a0a44c382596073708822000b376b9ebb105ed0`. Ce ledger ne reconstitue pas un échange individuel depuis ses agrégats. |
| Pilote fournisseur | Worker distinct `gcr-pilot-runner` | Code de ce dépôt, campagne privée conservée. Son pack est fictif ; ce n’est ni le corpus hébergé ni un essai client. |
| Observatoire | `GautierDorval/pagup-live-observatory`, domaine privé `observatory.pagup.com` | Consomme les rapports Runtime/gouvernance et un agrégat du pilote. Il ne devient pas observateur indépendant de l’inférence en relayant ces données. |
| Producteur gouvernance | `GautierDorval/ai-governance-visibility-worker` | Source distincte, couverture partielle conservée dans le rapport courant. Contrat canonique de mesure rattaché à `q-ledger` par les instructions Observatoire. Aucun contrat `q-ledger` modifié ou nécessitant une migration. |
| Pilote client nommé dans le mandat | `deminimoteur.com`, graphie du mandat | Aucun dépôt ou lien de déploiement établi dans les références consultées. État actuel non vérifié. Aucun rapprochement automatique avec un nom voisin, aucune visite ou interaction client. |

Les annotations Cloudflare sont des déclarations de provenance ; elles ne prouvent
pas à elles seules une égalité entre les octets déployés et un arbre Git. Le SHA
de `main` d’un producteur n’est jamais utilisé comme substitut de sa version active.

## 3. Carte des responsabilités

Les références du service ci-dessous désignent le commit GGF `91c414bea471edfc3009d0087a9aff8426fb16fd`,
disponible localement. Les liens relatifs désignent la référence GCR de ce lot.

| Étape | Observation ou décision réelle | Référence et limite |
| --- | --- | --- |
| HTTP | Méthode, route, paramètres fermés, réponses, codes d’erreur, statut et durée. Vérification de l’intégrité des ressources avant service. | GGF `runtime-worker/src/index.ts:143`, `:272` ; `src/telemetry.ts:145`. Cela ne prouve pas la lecture effective du corps par un modèle. |
| MCP | Requête JSON-RPC, sélection d’une opération/ressource enregistrée, réponse ou erreur. Récupération par liaison, contrôle de racine et d’empreinte, enveloppe avec les octets. | GGF `mcp-worker/src/index.mjs:28`, `:42`, `:55`, `:113`. Identifiant RPC et métadonnées client ne sont pas un identifiant d’exécution de modèle. |
| Pack | Identité, langue, version, manifeste, empreintes, racine et archives selon leur représentation déclarée. Une version historique conserve sa racine. | [Contrat de vérification](../docs/verification.md), [schéma de pack](../spec/context-pack.schema.json), [schéma d’instantané](../spec/runtime-snapshot.schema.json). Pas de nouvelle autorité sémantique créée par l’empreinte. |
| Admission | Le producteur refuse un jeu d’artefacts incohérent ; le consommateur fournit sa racine, ses clés et sa politique d’usage. | [decideConsumption](../spec/reference/consumer.mjs), [vérificateur](../spec/reference/verification.mjs), [signatures](../spec/reference/signatures.mjs). Vérification technique et permission locale demeurent séparées. |
| Appelant | L’utilisateur-agent est classé comme déclaré, suspecté ou inconnu ; le signal réseau Cloudflare est séparé. `clientInfo` décrit un client déclarant son nom/version. | GGF `runtime-worker/src/classifier.ts:62`, `:111`, `src/telemetry.ts:169`. Les contrôles d’hôte/origine MCP ne sont pas une authentification du modèle. Le GET interne du résolveur ne transmet pas automatiquement l’identité du client externe. |
| Inférence | Le service de packs n’émet ni ne relaie une requête fournisseur. Le harnais pilote distinct construit et envoie une requête au fournisseur choisi. | [buildProviderRequest et sendProviderRequest](../spec/examples/semantic-boundaries/pilot-provider.mjs). C’est ici que configuration demandée et réponse reçue peuvent être observées. |
| Reçu d’inférence | Requête exacte, réponse brute, identifiant et modèle retournés, empreintes, fin, usage, erreurs et horodatages sont conservés dans les tentatives. | [Décodage fournisseur](../spec/examples/semantic-boundaries/pilot-provider.mjs), [exécution](../spec/examples/semantic-boundaries/pilot-execution.mjs), [campagne](../spec/examples/semantic-boundaries/pilot-campaign.mjs). Le journal et R2 sont la source native ; une projection de statut est dérivée. |
| Reçu de contexte | La fixture signée rattache un contexte à une racine sous une clé et une politique de test. Les observations publiques HTTP/MCP sont des déclarations datées du producteur. | [Fixture](../spec/examples/synthetic/bundle.json), [contrats d’observation](../docs/observations.md). Ce ne sont pas des reçus d’inférence ni une preuve de production signée. |

Un en-tête utilisateur-agent ou la réponse verbale d’un assistant ne certifie
jamais le modèle. Le contrôle `data.model === request.model` conserve une
**déclaration technique fournisseur conforme à la configuration**. Il n’observe
ni les poids internes ni un routage caché. Une métadonnée relayée garde son origine.

## 4. Deux preuves de portées différentes

### A. Observation HTTP/MCP existante

La [pièce du 19 octobre](../evidence/instance-2026-10-19.json) est conservée sans
modification, SHA-256 du fichier
`74503371f7e6a60bf93f0218da194a4000d2f6c514cb60e748e83763c5852ad1`.
Fenêtre déclarée : 19 octobre 2026, 14:11:55.743047 à 14:13:30.5713657 UTC,
poste du producteur, instance `context.gautierdorval.com`.

La sous-preuve `current-pack-fr` indique la route
`/v0/packs/interpretive-governance-overview/fr`, 6 471 octets, empreinte
`979da3ad164fa14eed40993e75af83a385dea407e794f7089941f739301c8cef`, racine
`sha-256:beaeed142e9b3898734414eeebf7ab6283ef57dbd7c2af53479405395e5a4fe4`.
Le producteur déclare six échanges MCP et cinq comparaisons directes, au sein de
576 requêtes applicatives ; le smoke de 156 ressources reste une autre population.

`modelInvocation: false`, `sourceCommitVerified: false` et
`rawResponsesPublished: false` bornent cette preuve. Les corps complets et les
en-têtes de chaque échange ne sont pas dans ce résumé ; aucune requête manquante
n’est reconstruite. Il documente un contrôle technique réel daté, pas l’identité
d’un modèle consommateur, l’usage du pack, son influence ou l’état live actuel.

### B. Tentative fournisseur réelle conservée

Le second exemple est justifié parce que le harnais appelle réellement un modèle,
contrairement au chemin A. Lecture locale le 16 novembre à 15:40 UTC, sans requête
fournisseur, du cache privé conservé de la campagne `gcr-pilot-20261107`.

| Pièce | Identité vérifiée |
| --- | --- |
| Manifeste de campagne | `14f54dce16262df4be5f995d47b9edaaca1af21930389638902f22869d2f8ad3` |
| Tentative native | `attempts/respondent/trial-0001/1.json`, 17 497 octets, SHA-256 `d6d0200eb6ca83668d6275b7d3cf25140cc18a19dcdf45112c2dd7111cfa5f37` |
| Période | 7 novembre 2026, début `23:01:15.987Z`, réception `23:01:18.580Z`, horloge du harnais |
| Requête | Anthropic, rôle `respondent`, `request.model` et `body.model` : `claude-haiku-5-5` ; SHA-256 `6ce1badeedd97252e71bf4c3293ea5cc51f314a09b602023f61e0e5215e4dcc2` |
| Réponse | Le JSON brut et la réponse normalisée déclarent `claude-haiku-5-5` ; identifiant de réponse concordant, conservé privé. SHA-256 brut `b2f972ee263326f5ddd615de711a3ad62bcc86b3a5b2fa2591ab58376230538c`, fin `max_tokens` |
| Pack fictif | `fictional-boreal-quebec-fr`, version `semantic-boundaries-1`, fichier de 10 328 octets, SHA-256 `5332c7ba1a4df913496cb7ec45ce3ee3793234d07ca8377dec89736396153235` |

Vérifications réellement exécutées : 12 entrées figées rehashées contre le plan de
livraison ; `loadCampaign` avec résolveur exclusivement local ; reconstruction de
la requête par `buildProviderRequest` et égalité complète avec la requête conservée ;
redécodage du corps par `decodeProviderResponse` et égalité avec les champs
normalisés ; empreintes de l’enveloppe, de la requête et de la réponse contrôlées.
Le pack provient des entrées figées de cette campagne, pas d’un téléchargement
hébergé lors de l’essai. Aucun lien à une session HTTP/MCP n’est inventé.

La provenance privée permettant de retrouver ces octets est le cache
`native-evidence-cache/f40f6903437e98519065b0e985c3f9125a3958d7baff497980516888802d67b4.json`
du paquet `gcr-provider-review-b2ec4c6d2cb74e4981affa59df169471`, sous le dossier
temporaire du poste. Le handoff conservé dans
`.git/handoffs/provider-campaign-20261107/2026-11-12-gcr-pilot-final-reprise.md`
en décrit l’emplacement. Ces pièces privées ne font pas partie du package public.
Le cache hérité a été lu, pas déplacé ni nettoyé.

Le résultat conservé dans `resume-20261112/native-proof-2026-11-12T14-34-28.120Z.json`
a été rehashé : payload
`31b02b2db36a9dd15b320bb02134e160fa92dae36eaa1a4d4816e14c00065b3b`, concordant
avec `archive-verification-2026-11-12T14-46-52.821Z.json`. Il porte `mode: provider`,
`status: RUN`, `executionState: COMPLETED`, 560 réponses terminées, dont 433 limitées
en sortie. `judgmentsPending: 294` ne signifie pas qu’un fournisseur travaille
encore : la couverture des paires de jugements demeure incomplète.

Ce contrôle ciblé ne rejoue pas la vérification exhaustive du 12 novembre et ne
revendique pas une nouvelle lecture des 3 580 objets du cache. L’empreinte du reçu
de cette vérification historique est
`f663766d53f76e3881b288f4d8a1935df3a357c6f70eaa3f4fbfa6b77c434102`.
Les réponses sont réelles, le service décrit par le pack est fictif et la chaîne
de conservation demeure celle du producteur. Aucun résultat de fidélité générale
ou d’efficacité commerciale n’en découle.

## 5. Statuts et informations absentes

| État existant | Sens exact |
| --- | --- |
| `NOT_RUN` du plan | `spec/examples/semantic-boundaries/experiment-plan.json:4` est un plan figé. Les textes scientifiques utilisés comme entrées et les anciens reçus ne sont pas réécrits. Ce statut n’est pas un inventaire actuel des campagnes. |
| `SYNTHETIC_RUN` | `pilot-campaign.mjs:390` l’émet pour `mode: synthetic`, même si les 560 réponses simulées sont produites. Aucune requalification en fournisseur réel. |
| `RUN` du résultat | En mode fournisseur, au moins une tentative scientifique d’exécution suffit à ce libellé. Il faut lire séparément `executionState`, les comptes et la couverture des jugements. `RUN` seul ne signifie ni campagne complète ni succès scientifique. |
| `NOT_ESTABLISHED` du statut privé | En l’absence de résultat et de répondant réglé, `readCampaignStatus` ne déduit pas `RUN`. Ses états `not_started`, `in_progress`, `stale`, `finished` sont une autre dimension. |
| Absence de modèle côté pack | Hors responsabilité du service de contexte, pas un champ perdu à inventer. |
| Modèle absent, `null` ou différent dans une réponse fournisseur | `decodeProviderResponse` refuse l’identité. Il ne la remplace jamais par le paramètre demandé. |
| Métadonnée facultative `null` dans un transport injecté | `completedOutcome` conserve le manque comme `null`. Cela ne constitue pas une métadonnée reçue d’un fournisseur. |
| `cache_write_tokens: null` chez DeepInfra | Exception documentée du compteur facultatif, sans rapport avec l’identité du modèle. Aucun élargissement de cette exception. |

L’état du pilote client reste « état actuel non vérifié ». Un ancien essai local,
une observation T3 et le `RUN` fournisseur fictif ne changent pas ce statut.
Responsable du rattachement manquant : Gautier ; prochaine action utile pour un
éventuel contrôle client : fournir ou confirmer sa référence canonique, sous un
mandat propre. Ce manque ne bloque pas la conclusion sur la référence GCR.

## 6. Chaîne de production et Observatoire

Lectures du plan de contrôle Cloudflare le 16 novembre entre 15:38 et 15:43 UTC :

| Composant | Version active, allocation 100 % |
| --- | --- |
| Résolveur HTTP | `e3753d77-f06d-4a0e-96d9-70af35f292da` |
| Adaptateur MCP | `f0921d61-4b62-4423-82f6-14c4b6f53090` |
| Runtime ledger | `7c069c8d-7ecd-42db-9de0-cd72c18dceda` |
| Producteur gouvernance | `af57712d-0bf1-44aa-b40e-ae13928dd57a` |
| Pilote fournisseur | `28d95e08-534b-424f-926c-e717374d8369` |
| Observatoire | `28708d45-fa57-42ed-9ebc-4b9423cbfcde` |

Les liaisons Observatoire vers les deux producteurs et le pilote sont présentes.
La version et le manifeste épinglés du pilote concordent avec les pièces retenues.
Access est `self_hosted`, groupe des propriétaires et méthode de connexion requise ;
domaine privé lié au service, `workers.dev` et prévisualisations désactivés.
Cron quotidien `0 12 * * *` et surveillance `7,22,37,52 * * * *` présents.

D1, interrogé uniquement avec `SELECT`, donne pour le rapport du 15 novembre une
tentative terminée le 16 novembre à `12:01:43.777Z`, version Observatoire attendue,
`overall_status: complete`, deux sources réussies, deux résultats `stored`.
La tentative du jour précédent est également complète. `trigger_evidence_status`
reste **`cron_consistent`**, pas une preuve indépendante d’origine naturelle.

Les deux rapports de tête et leurs deux manifestes ont été relus dans R2, avec
SHA-256 et tailles identiques aux références D1 :

| Pièce | Octets | SHA-256 |
| --- | ---: | --- |
| Rapport Runtime | 8 006 | `8862fe33e0895446a0b9a4a12ba5da4c9a3c4dc1a406b5d3dd480fd37008548b` |
| Manifeste Runtime | 1 081 | `a308e4910c9c2b360eb9c12c35959ba531c74340e8520f8730a8ee3f86fca0d4` |
| Rapport gouvernance | 9 270 | `4066abf300635e9da69a19515db5f7313c94868ea276f010a318e2201f9cd6e8` |
| Manifeste gouvernance | 790 | `025a04f7492518c46c8b77c2580329e5cb63e2ce4d70f816d8f1504412768505` |

Le connecteur renvoyant du JSON déjà analysé, la comparaison des octets R2 a utilisé
quatre GET API bornés, sans redirection et sans exposer le jeton. Runtime indique
`measured`, source `1a0a44c382596073708822000b376b9ebb105ed0` ; gouvernance indique
`partial / producer_source_partial`, source observée
`8b1f5f5e23e000d877178689250811553047ef6b`. Les deux rapports conservent
`origin_claim_admissibility: inadmissible`. Le registre interrogé contient encore
20 lacunes gouvernance non résolues, aucune lacune Runtime non résolue dans cette
requête. Ces limites préexistent au lot documentaire et ne sont pas corrigées ici.

La requête sans session Access vers `/api/v1/operations/status` a répondu HTTP 302
à 15:43:16 UTC ; redirection non suivie, aucun corps lu. **Statut opérationnel
authentifié et interface actuelle non vérifiés dans cette session.** Responsable
du suivi : mandat Observatoire ; prochaine action : lecture authentifiée autorisée
de ce statut, sans collecte. Les preuves indépendantes d’origine naturelle, la
continuité complète, tous les anciens objets et les inventaires intégraux de pins
ne sont pas requalifiés par ces lectures ciblées.

Deux premières lectures avec un mauvais compte Cloudflare ont renvoyé HTTP 404,
code `10007`. Le compte a ensuite été résolu depuis le plan de livraison existant.
Ces erreurs d’ancrage ne sont pas des preuves d’absence des Workers.

Le lot ne change aucun contrat, schéma, adaptateur, source de collecte, pin de
production ou reçu. Les seuls registres régénérés sont ceux du package public pour
ses documents. Aucun redéploiement ni aucune collecte ne sont nécessaires.
La chaîne ne reçoit pas le verdict global « tout est synchronisé et opérationnel ».

## 7. Écarts, corrections et transferts

**Écart documentaire démontré.** Les guides d’instance à la base examinée disent
« NOT_RUN à ce jour » / « NOT_RUN to date ». Plusieurs entrées généralisent aussi ce
statut au pilote, alors que le résultat conservé du fournisseur est `RUN` et
`COMPLETED`. Les guides et l’entrée des preuves qualifient maintenant ce statut
comme celui du plan figé ou d’un essai daté, avec renvoi vers ce compte rendu.

**Clarification de provenance.** Les guides FR/EN d’instance et de pilote exposent
explicitement la responsabilité du harnais, le caractère déclaré des identités,
et l’absence d’attestation des poids. Le code conserve déjà les deux côtés de
l’échange : aucun défaut de normalisation démontré, aucune extension de contrat.

Les plans, fixtures, observations historiques, réponses, journaux et empreintes
sources demeurent inchangés. Ce compte rendu est un dérivé daté. L’ajout au registre
`records/README.md` et à `package-policy.json` assure sa découvrabilité et sa
couverture par les registres de droits/empreintes.

### Transfert public FR/EN à exécuter dans un mandat distinct

Obligation active : [MAINTAINING.md](../MAINTAINING.md), section de synchronisation
des explications. Les remotes et chemins ci-dessous ont été confirmés dans les
arbres Git locaux ; ce n’est pas une vérification des pages servies.

| Dépôt identifié | Fichiers concernés |
| --- | --- |
| `GautierDorval/gautierdorval-site` | `src/content/doctrine/fr/runtime-contexte-gouverne.md`, `src/content/doctrine/en/governed-context-runtime.md` ; `src/content/pages/fr/web-agentique.md`, `src/content/pages/en/agentic-web.md` ; `src/content/clarifications/fr/runtime-vs-mcp.md`, `src/content/clarifications/en/runtime-vs-mcp.md` |
| `GautierDorval/Pagup-site` | `src/data/services/sites-agentiques-gouvernes.md`, `src/data/services/governed-agentic-websites.md` |

Révisions de lecture disponibles : `fd269ab9122cb458144233910649309fb451deb4` pour
le site personnel, `82e43b2990e86ee74b8571042ff24b6e69f856c5` pour Pagup. Certains
passages distinguent déjà les anciens essais MCP de la campagne fournisseur :
conserver ces explications et les blocs historiques, sans modification globale.

Passage FR proposé pour les pages explicatives :

> Le Runtime peut documenter le contexte livré et son intégrité. Il n’observe pas
> le modèle qui consommera ce contexte. Le harnais qui appelle un fournisseur doit
> distinguer le modèle demandé des métadonnées retournées par celui-ci. Une
> livraison HTTP ou MCP ne prouve ni l’utilisation du pack ni son influence sur
> une réponse. Le plan public figé conserve son statut `NOT_RUN` ; la campagne
> fournisseur examinée séparément possède un résultat `RUN` terminé, dont la
> couverture d’évaluation demeure incomplète.

English equivalent :

> The Runtime can document delivered context and its integrity. It does not
> observe the model that will consume that context. The harness calling a provider
> must distinguish the requested model from metadata returned by that provider.
> HTTP or MCP delivery proves neither pack use nor its effect on an answer. The
> frozen public plan retains `NOT_RUN`; the separately examined provider campaign
> has a completed `RUN` result with incomplete evaluation coverage.

Passage commercial FR proposé pour Pagup :

> La livraison d’un contexte vérifiable et l’évaluation d’une réponse sont deux
> étapes distinctes. Le Runtime documente le pack servi. L’identification du modèle
> et l’examen de sa réponse relèvent du harnais appelant et de ses preuves. La
> campagne conservée sur un service fictif ne valide pas un déploiement client.

English equivalent :

> Delivering verifiable context and evaluating an answer are separate steps. The
> Runtime documents the served pack. Model identification and answer assessment
> belong to the calling harness and its evidence. The retained campaign on a
> fictional service does not validate a client deployment.

**Suivi ouvert :** aucun fichier de ces deux sites n’a été modifié ou publié.
Responsable : Gautier pour autoriser le lot inter-dépôts, puis son exécutant.
Prochaine action : intégrer ces passages proportionnés après revalidation des
branches et publications courantes, garder les dates historiques, ajouter les
liens au candidat GCR effectivement publié, valider les deux langues et inspecter
les captures mobiles des pages réellement rendues. Une clôture locale n’est pas
une synchronisation publique.

Le motif `gh-aw` a été vérifié dans les
[notes officielles v1.2.3](https://github.com/github/gh-aw/releases/tag/v1.2.3) :
elles distinguent épinglage des téléchargements et routage du modèle pour les
configurations Copilot éligibles. La page détaillée de routage n’a pas pu être
ouverte par l’outil Web ; aucune conclusion supplémentaire n’en est tirée.
Aucune dépendance à `gh-aw` ni responsabilité nouvelle du GCR n’est déduite de ce motif.

## 8. Validation et clôture locale

Les vérifications de preuve et les lectures datées sont détaillées ci-dessus.

| Contrôle exécuté | Résultat et portée |
| --- | --- |
| Régénération des registres | `npm run regenerate` a refusé deux fois le fichier préexistant `.claude/settings.local.json`, y compris hors sandbox. Le générateur parcourt le disque et n’applique pas les exclusions Git. Aucun contrôle affaibli et aucun fichier d’autrui déplacé. |
| Export de validation | Copie vérifiée par SHA-256 des 245 chemins de `package-policy.json` dans un temporaire propre. Aucun clone ni espace de développement supplémentaire. `node scripts/regenerate.mjs --write` puis `--check` réussis sur cet export ; seuls `rights.json` et `package-manifest.json` sont reportés au dépôt. |
| Suite obligatoire | `npm test` dans cet export : code 0, 545 tests découverts, 544 réussis, 0 échec, 0 annulation, 1 ignoré. Le test « a symbolic link is refused » exige des privilèges de liens symboliques indisponibles. Durée du runner : 85.840 s. Démonstration fictive et projection synthétique vérifiées, sans revendication live. |
| Liens et documentation | La suite inclut les liens/ancres des documents inventoriés, les distinctions éditoriales et les contrôles de package. Aucun nouveau test ajouté pour cette clarification. Relecture ciblée finale : 8 tests éditoriaux réussis sur 8. Scan de navigation : 10 documents sur 10, aucune URL de laboratoire interdite. `git diff --check` réussi. |
| Recherche de secrets | Gitleaks 8.30.1 sur un export des seuls 13 fichiers du lot : code 0, aucun secret détecté. Cela ne certifie pas à lui seul l’absence de toute donnée sensible ; les références privées et les libellés ont aussi été relus. |
| Préservation | Aucun diff sous `spec/`, `test/` ou `scripts/`, ni dans les trois observations historiques HTTP/MCP. Le plan figé et `.claude/settings.local.json` conservent leurs empreintes initiales. Les reçus fournisseur ont été lus seulement. |
| Visualisation locale | 11 captures à 390 × 844 et 2 à 1 365 × 900 inspectées. Les paragraphes FR/EN, titres et liens du contrôle restent lisibles ; aucun débordement horizontal de page. Les tableaux larges défilent dans leur conteneur. |

`visual_applicability: applicable` pour les guides destinés à la référence publique.
Les captures utilisent un aperçu Markdown local produit par `ConvertFrom-Markdown`
et une feuille de style de lecture ; elles ne reproduisent pas toute l’interface
GitHub et ne prouvent aucune publication. Les écrans de production n’ont pas été
modifiés. Le rendu GitHub final et les pages des deux sites restent à vérifier lors
de leur publication autorisée.

Preuves du lot sous
`$env:PAGUP_COLD_STORAGE/Preuves-Audits/governed-context-runtime/2026-11-16-observation-scope/` :
`npm-test.log`, captures `*-390.png` et `*-1365.png`, manifeste d’empreintes et
relevé de validation final. Les captures portent sur les passages modifiés et
deux portions du compte rendu, pas sur chaque pixel de toutes les pages longues.
Les temporaires de validation et d’aperçu sont supprimés après le contrôle final ;
le cache historique du pilote est conservé.

Le point de clôture est documentaire : responsabilités explicites, ambiguïté
courante corrigée et limites restantes attribuées. Il n’inclut ni publication,
ni audit indépendant, ni qualification complète de l’Observatoire ou du client.
