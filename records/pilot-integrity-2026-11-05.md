# Intégrité du pilote GCR, 5 novembre 2026, suivi du 6 novembre

## Périmètre et état

Mandat 3, « intégrité de l’exécution et des évaluations GCR », remis par Gautier.
Dépôt : `GautierDorval/governed-context-runtime`, remote HTTPS du même nom.
Base locale et `main` distant relus : `a51ab851c1e77a43e83913e09442979c1d6a0e89`.
Branche locale : `codex/pilot-integrity-20261105`. Le dossier de référence sert
d’espace de travail sous lease. Son dossier `.claude/` non suivi et ses caches
préexistants sont préservés; l’index était vide au démarrage.

**Travail : `COMPLETED_LOCAL_CONTRACT`. Intégration : `WAITING_INTEGRATION`.**
La campagne demeure **`NOT_RUN`**, avec 560 réponses prévues par configuration,
`observedResponses: []`, `scores: null` et configuration/destinations nulles.
Les captures sont synthétiques et ne constituent aucune réponse de campagne.
Aucun appel de modèle expérimental, juge distant, SDK fournisseur, fusion,
déploiement ou collecte n’est exécuté. Après la livraison locale du 5 novembre,
Gautier a autorisé séparément le partage du candidat initial sur la PR brouillon
22, puis son audit de code par Claude. Le suivi ci-dessous distingue cet audit
de la campagne, qui reste non exécutée. La révision corrigée attend son audit final.

Le rapport est un journal technique brut, sans changement d’interface ou de
document produit rendu : `visual_applicability: not-applicable`.

## Démarrage et découverte

Instructions Pagup consultées à la révision disponible
`e95c8ff0430a52bdcdf9071d8f40644de302872c` : `AGENTS.md`,
`workflows/tooling-readiness-p0-protocol.md`, frontière de non-navigation des
laboratoires et registre des hôtes, protocoles de reprise multi-dépôt, de cycle
de vie des briefs/handoffs et des espaces, protocole Codex/Claude, validation
comportementale et règle de qualification des échéances. Aucune échéance de
projet nouvelle n’a été trouvée. Aucun laboratoire n’a été contacté.

Dans GCR : `CONTRIBUTING.md`, `MAINTAINING.md`, `package.json`,
`package-policy.json`, `tsconfig.json`, `.github/workflows/verify.yml`,
`records/README.md`, les deux `docs/model-comparison.md` / `docs/en/model-comparison.md`,
`test/pilot-plan.test.mjs` et les fichiers du répertoire
`spec/examples/semantic-boundaries/` ont été inspectés. Aucun `AGENTS.md` ou
`CLAUDE.md` propre à ces sous-répertoires n’a été trouvé.

Les recherches ciblées couvrent `spec/`, `scripts/`, `test/`, le manifeste et
le verrou npm : appels OpenAI/Anthropic, SDK, sérialisation, reprise, jugements,
dénominateurs, états de trace et InferensLab. Les mécanismes de comparaison
MCP Apps et les projections d’observations publiques ont un autre contrat;
leurs transports ne sont pas des expéditeurs du pilote. Aucun raccordement
InferensLab, moteur de tentatives/jugements ou exportateur de traces de campagne
n’a été découvert. L’unique frontière exécutable du pilote est
`assemblePilotPrompt(...) -> Uint8Array`. Le plan et la grille sont déclaratifs.

Le doctor a été réellement exécuté : Node/npm/Python/Git disponibles; verdict
global 1 pour des configurations GSC/GA4 et lanceurs MCP Claude hors lot.
La revue mensuelle n’est pas due. Git Schannel a échoué avec
`SEC_E_NO_CREDENTIALS`; la lecture distante avec `http.sslBackend=openssl`
a confirmé le SHA ci-dessus, sans changement de configuration Git globale.

Les trois modèles `annexes/01_modele_rapport_execution.md`,
`02_modele_registre_preuves.csv`, `03_modele_decisions.md` sont absents du dossier
du mandat; la recherche bornée sous ce dossier n’en a trouvé aucune copie.
Ce rapport contient leur information demandée; leur consultation n’est pas revendiquée.

## Correspondance des exigences

`test/pilot-plan.test.mjs` désigne ci-dessous la suite réellement exécutée.
Le [registre de preuves](../evidence/pilot-integrity-2026-11-05.json) conserve
commandes, résultats et empreintes du code testé. « En attente » ne signifie
ni succès d’un adaptateur ni test ignoré par Node.

| Cas | Existante | Préparée ici | Reste à intégrer |
| --- | --- | --- | --- |
| 01 Assemblage nominal | Comparaison exacte FR/EN, quatre conditions | Capture locale des huit entrées; seul le document varie | Objet/requête du futur adaptateur |
| 02 Fidélité UTF-8 | BOM conservé; décodage fatal | Témoin hexadécimal écrit à la main : accents composés/décomposés, NBSP, NNBSP, espace fine, apostrophes, CRLF/CR/LF et espaces finaux | Préservation après sérialisation fournisseur |
| 03 Encodage invalide | Refus de `ff` | Sept séquences invalides, zéro capture, puis entrée valide acceptée | Refus avant transport du futur SDK |
| 04 Exclusion pédagogique | Identifiant, classification, réponse, affirmation et condition exclus | Sentinelles ajoutées pour dimensions, grille, couverture, carte et source; absence dans la capture finale, octets permis présents | Même contrôle après conversion SDK |
| 05 Interpolation | `JSON.stringify` du seul objet `evidence,question` | Accolades, guillemets, barre oblique inverse, retours et caractères français; pas de seconde substitution | Sérialiseur fournisseur absent |
| 06 Rôles et ordre | L’assembleur n’attribue aucun rôle API | Limite explicitée; aucune promotion de documentation en `system` | Décision de répartition commune/document puis capture du vrai adaptateur |
| 07 Blocs système vides | Aucun tableau de messages système | Aucun adaptateur fictif ajouté | Contrat fournisseur à choisir; chaîne vide et tableau mixte à tester |
| 08 Isolation | Fonction pure, conversations neuves prescrites | Deux captures indépendantes; mutation du premier tampon sans effet sur l’appel suivant ni l’entrée; reprise déterministe du premier cas | Isolation des conversations, outils, récupération et mémoire du client réel |
| 09 Succès technique | Conservation du brut et de la terminaison prescrite | Inventaire du point de branchement | Moteur de résultat/export absent : non exécuté |
| 10 Exception explicite | Tentative technique sans jugement prescrite | Pas de faux export de trace | Moteur absent : injecter l’erreur puis relire le vrai résultat exporté |
| 11 Exception sans message | Même règle, sans condition sur le texte de l’erreur | Aucun succès déduit d’un message vide | Moteur absent : `new Error('')` à tester à l’export final |
| 12 Réponses particulières | Précédence de la grille déjà contrôlée | Caractérisation de `trim()` sur vide, blancs français/BOM, U+200B, refus et fragment; aucun jugement sémantique simulé | Classificateur/jugements absents; table d’acceptation ci-dessous |
| 13 Reprise bornée | Une reprise après le passage, même parent et deux numéros, déjà contrôlés dans le plan | Contrat existant conservé | Ordonnanceur absent : chronologie et deux appels locaux à prouver lors du raccordement |
| 14 Comptage / réseau | 560 essais, équilibre, applicabilité et règles d’accord contrôlés | Huit gardes de transport éprouvées; suite ciblée aussi exécutée avec permission Node sans réseau | Agrégateur absent : compteurs reçus/achevés/évaluables et exclusions des paires à exercer |

La capture est une copie locale des octets retournés, pas un objet API inventé.
Les gardes interceptent `fetch`, HTTP(S), socket TCP, TLS et création UDP avant
le chargement de l’assembleur. Un dernier test vérifie le compteur des tentatives
interceptées pendant les tests, y compris celles dont l’erreur est avalée. Huit
essais volontaires sont distingués des assemblages, dont le compteur reste zéro.
Une activité asynchrone déclenchée après ce dernier test n’est pas couverte par
son assertion. Le hook final conserve un contrôle supplémentaire et restaure
toujours les espions, mais son échec seul ne garantit pas un code de sortie non
nul sous Node 26.12.1 avec `--test-isolation=none`.

Les gardes JavaScript couvrent seulement les points d’entrée énumérés, sans
garantie sur DNS, le constructeur UDP direct, du code natif ou des sous-processus.
L’exécution ciblée sous permissions Node n’autorise ni réseau ni sous-processus;
la CI ordinaire n’utilise pas cette même restriction. Aucun transport n’existe
dans l’assembleur actuel. Cette frontière devra être revue avec un vrai adaptateur.

## Contrat restant pour réponses et dénominateurs

Les lignes suivantes sont des **attentes d’intégration non exécutées**. Elles
ne constituent ni un nouveau format d’observation ni un évaluateur automatique.

| Entrée synthétique future | Résultat attendu selon le protocole existant |
| --- | --- |
| Échec transitoire, aucune réponse achevée, y compris erreur au message vide | Tentative et erreur conservées; aucun label, aucune utilité, aucune paire d’accord; au plus une reprise admissible après le passage |
| Réponse achevée `''` ou blanche après `trim()` | Brut conservé; dimensions applicables `UNSCORABLE`, utilité `UNDETERMINED`; aucune reprise |
| U+200B seul | Non blanc après `trim()`, ininterprétable; jamais `PASS` automatique |
| Refus achevé | Réponse reçue à juger selon la grille; aucune erreur de transport ou reprise déduite du refus |
| Plafond 512, violation visible ou contenu exigé omis | Réponse et motif de fin conservés; dimension concernée `FAIL`, sans continuation |
| Plafond 512, fragment ininterprétable sans échec visible | `UNSCORABLE`; pas de crédit pour une absence de violation |
| Plafond 512, critère établi par du texte interprétable | `PASS` possible pour ce critère seulement; utilité évaluée séparément |
| Dimension non applicable d’une réponse achevée | `NOT_APPLICABLE` avant examen du contenu; exclue du dénominateur applicable |
| Jugement manquant d’un des deux évaluateurs | Paire exclue de l’accord, manque publié, aucune imputation |

Les comptes attendus, tentés, reçus, achevés, évaluables, non évaluables, erreurs
techniques et non-applicables doivent demeurer distincts. `UNSCORABLE` fait
partie des catégories d’accord lorsque les deux jugements applicables existent;
une non-réponse technique n’y entre jamais. Les appariements de comparaison
restent configuration/cas/langue/répétition; les groupes d’accord restent ceux
du plan. Aucun score global n’est créé. L’instrumentation de traces est non
applicable ici, puisqu’aucun exportateur de campagne n’existe.

## Modifications et validation

L’assembleur et les documents expérimentaux n’ont pas été modifiés : aucun
défaut de leurs garanties locales existantes n’a été reproduit. Les écarts
étaient des contrôles de régression manquants et des frontières non intégrées.
Le diff ajoute six tests à la suite existante et renforce son test nominal,
plus ce rapport, ses preuves et leur inventaire/licence/empreintes générés.
Aucune dépendance, politique expérimentale ou version de contrat ne change.
Les deux protocoles FR/EN restent identiques à la base.

Les validations complètes utilisent une copie temporaire des seuls fichiers
inventoriés : le vérificateur refuse légitimement les dossiers hors inventaire
du checkout partagé. Cette copie est un artefact de validation, pas un second
espace de développement. `npm ci --ignore-scripts --no-audit --no-fund --offline`
y installe le verrou existant. Pour les métadonnées de la campagne générative,
`GIT_DIR` désigne le dépôt de référence, `GIT_WORK_TREE` la copie et
`GIT_OPTIONAL_LOCKS=0`; `testedCommit` désigne le candidat initial
`d953df2019355e92d288bd1d40fc46cb4b36913d` avec `dirty: true`, pas une révision
corrigée prétendument committée. Les empreintes distinguent le contenu testé.

Résultats du suivi du 6 novembre et commandes exactes : voir le registre de preuves.
Échecs intermédiaires du 5 novembre conservés : formatage initial, signature TypeScript de la sonde UDP corrigée,
`fast-check` absent des dépendances préexistantes, puis campagne générative
incapable de trouver Git dans la première copie. Aucun de ces échecs n’est
présenté comme un défaut de la campagne expérimentale ou effacé du bilan.

| Commande | Résultat observé |
| --- | --- |
| Suite ciblée sur la base | 13 réussites |
| Suite ciblée finale, permissions Node sans réseau | 19 réussites, zéro échec, aucun test ignoré |
| `npm test` | 474 réussites, zéro échec, un test de lien symbolique ignoré faute de privilèges Windows |
| `npm run test:dev` | Formatage et types conformes; 35 tests de schémas, 75 tests de propriétés réussis |
| Oracle Python inclus dans `test:dev` | 7000 comparaisons; deux mutants de propriétés détectés |
| Contre-épreuves R1 et R6 sur copies corrigées | Deux échecs par assertion; chaque processus sort avec 1; aucun crash compté comme détection |

La campagne générative bornée réussit, mais son indicateur
`completeFixedSeedQualification` vaut `false`; elle n’est pas présentée comme
la qualification complète à graines fixes. Les tests du compagnon MCP Apps ne
sont pas relancés : leur code et leurs dépendances ne changent pas.

## Audit et corrections du 6 novembre

Claude a audité le candidat initial `d953df2019355e92d288bd1d40fc46cb4b36913d`
et le paquet `3427b4c6fa8d7680d033cdb917a61ac55f10d227b3e2901ff370d4cc77d108c7`.
Son verdict exécuté est **`NO_GO` pour ce candidat**, à cause du contrôle final
réseau. La suite initiale passait à 18/18, mais la contre-épreuve R6 produisait
dix tentatives interceptées puis avalées avec un code de sortie nul. R1 montrait
que la mutation de la copie capturée ne protégeait pas contre un retour mémoïsé
partagé. Ces défauts portent sur les tests; l’assembleur actuel reste inchangé.

Corrections regroupées dans cette révision :

- **R6** : dernier test explicite du compteur; restauration des espions dans
  `finally`; limites temporelles et de couverture ci-dessus.
- **R1** : mutation du véritable tableau retourné, contrôle de l’entrée appelante,
  nouvelle instance à la reprise et conservation du premier tableau muté.
- **R4** : retrait de l’assertion qui comparait deux conversions de la même chaîne
  immuable. La caractérisation de `trim()` demeure.

Les deux mutants de Claude ont été rejoués par Codex avec le test corrigé :
19 tests chacun, 18 réussites, un échec par assertion et code de sortie 1.
L’assembleur intact passe les 19 tests. La révision n’est pas encore approuvée
par un audit indépendant; le verdict initial ne lui est pas transféré.

Restent à traiter lors du raccordement réel, sans modification du protocole ici :
**R2**, une demi-paire UTF-16 isolée dans `instruction` devient U+FFFD;
**R5**, `evidence: undefined` est omis par `JSON.stringify`; et la couverture
DNS/UDP directe. Les instructions et faits JSON du plan actuel ne présentent
pas ces entrées. **R3** demeure une suggestion de couverture : la sonde de Claude
a vérifié les 14 assemblages des sept cas FR/EN avec un document témoin et n’a
observé aucune fuite; cette sonde ne devient pas un résultat de campagne.
Ces suivis restent consignés ici; aucune intégration supplémentaire n’est ouverte.

Les rapports originaux, sondes, mutations et journaux sont conservés dans le
handoff local. Le registre de preuves épingle leurs empreintes et les résultats
rejoués. L’audit de code est distinct de tout appel expérimental de modèle.

## Chaîne Runtime, gouvernance et Observatoire

Le lot ne modifie aucun contrat, schéma, pack, pin, adaptateur producteur,
collecte ou rendu déployé. GCR demeure ici la référence publique et son pilote
synthétique; les producteurs privés ne consomment pas ses tests. Les sources
canoniques et consommateurs ont été identifiés en lecture seule dans les
épinglages du consommateur : gouvernance, agrégats Runtime, schémas q-ledger
et registre de l’Observatoire. Il ne s’agit pas d’une requalification complète
de ces contrats externes. Aucun repin sur `main` ni synchronisation de code
externe n’est nécessaire.

La relecture de production du 5 novembre confirme les allocations actives,
les liaisons, le cron journalier à 12 h UTC et la protection Access. D1 montre
la tentative du 5 novembre terminée avec deux archives pour le 4 novembre,
sur la version Observatoire attendue. Les quatre objets R2 correspondants
(deux rapports et deux manifestes) ont été relus en octets : longueurs et
SHA-256 concordent avec D1. Le journal indique `cron_consistent`; ce champ ne
prouve pas à lui seul l’absence de déclenchement manuel historique.

Des trous Runtime préexistants pour les rapports des 2 et 3 novembre persistent.
Le statut opérationnel authentifié reste **non vérifié** : la route retourne
302 vers Access sans session utilisateur. Les lectures D1/R2 ne remplacent
pas cette route ni une preuve de continuité complète. Responsable du suivi :
opérateur de l’Observatoire; prochaine action : lire le statut avec sa session
Access. Une éventuelle reprise historique demeure une décision distincte.
Les identifiants privés et reçus détaillés restent dans le handoff local du mandat.

## Décisions et reprise

1. **D01** : conserver la fonction pure, sans expéditeur ou SDK ajouté pour
   fabriquer une frontière de test. Motif : aucune intégration de campagne existante.
2. **D02** : ne pas attribuer de rôles API. Le matériel reste documentaire;
   la répartition instruction/document est une décision d’intégration à ratifier.
3. **D03** : ne pas créer de moteur de scores, reprises ou traces de démonstration.
   Les cas 09–13 attendent leurs vrais points d’entrée; seuls les contrats
   déclaratifs et la primitive `trim()` sont contrôlés ici.
4. **D04** : les corrections Phoenix du mandat sont des motivations de tests,
   pas des défauts GCR reproduits. Aucune dépendance Phoenix n’est ajoutée et
   aucune revue de licence d’adoption n’est revendiquée.
5. **D05** : livraison locale initiale le 5 novembre; partage GitHub puis audit de
   code autorisés séparément. Le candidat corrigé conserve les mêmes exclusions :
   aucune campagne, fusion, publication de version ou mise en production.

Pour un transfert ultérieur vers InferensLab : identifier d’abord le dépôt et
l’interface, retenir le vrai client et sa version, ratifier la répartition des
rôles, puis reprendre ces témoins d’octets et sentinelles au dernier corps avant
transport. Injecter ensuite réponses/erreurs dans le moteur réel, relire ses
artefacts finaux et éprouver reprises/dénominateurs avec un transport local.
Ce raccordement n’est pas réalisé ni implicitement autorisé par le présent lot.
