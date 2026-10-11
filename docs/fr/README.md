# Runtime de contexte gouverné

Une interface déterministe qui distribue un pack de contexte précompilé pour une intention canonique déjà sélectionnée par un consommateur. Elle ne déduit pas l’intention d’un texte libre, ne compose pas de pack à la requête, ne génère pas de réponse et ne juge pas un modèle.

Le projet décrit les contrats de transport et de vérification. gautierdorval.com en est une instance et demeure la source canonique de sa doctrine. Ce dépôt public est une destination documentaire et d’implémentation de référence, sans devenir une nouvelle racine d’autorité.

Ce paquet public de référence documente des contrats proposés et fournit des exemples exécutables de vérification. Sa publication n’établit ni déploiement courant du Runtime, ni activation MCP, ni usage par un modèle, ni certification indépendante. Les verdicts d’audit historiques ne couvrent que leurs candidats enregistrés.

Sélectionner representation-gap lorsqu’une réponse de modèle déjà identifiée semble déformer la représentation de l’entité ou de la doctrine publiée. Choisir explicitement la langue. Lire le registre fermé, sélectionner l’identité exacte du pack et lier son contenu et son manifeste détaché à une racine de corpus épinglée séparément avant utilisation.

L’exemple de vérification de contexte attend un instantané, ses archives adressées par contenu et une racine de confiance obtenue séparément. Ces entrées ne sont pas incluses dans ce paquet; ses tests hors ligne utilisent des fixtures neutres. Les routes /v0/ proposées sont des contrats, pas des adresses publiques de téléchargement vérifiées. Obtenir les entrées publiées et une politique locale de clés par un canal approuvé distinct avant d’exécuter cet exemple. Aucun exemple n’envoie de requête à un modèle.

La vérification établit l’intégrité des octets selon le format déclaré. Le consommateur prend ensuite sa propre décision de permission bornée. Une signature JWS valide ne prouve ni vérité, ni identité réelle, ni fidélité du modèle, ni autorité d’exécution, ni état ultérieur de révocation. DSSE et JWS détaché sont des formats distincts.

Une page canonique statique suffit pour une définition simple ou une citation éditoriale ordinaire. Le pack est utile lorsque le consommateur a besoin de la sélection déclarée, de ses dépendances et de leur portée d’intégrité ensemble. Sa forme ne lui confère aucune autorité supplémentaire.

Séparer mesures opérationnelles, vérification technique locale et expériences externes sur des modèles. Data, une projection publique, cette documentation et un paragraphe du site peuvent décrire la même archive. Ce ne sont pas quatre confirmations indépendantes.

L’exemple de preuve publique inclus est synthétique. Son empreinte ne vérifie que son contenu projeté. La complétude de la source privée, le déploiement courant, l’adoption spontanée et les effets causaux sur les réponses de modèles ne sont pas établis.

Document: `0.1.0`. Interface: `0.3.0-proposed`.

Corpus local, non vérifié en production: `sha-256:01aef227a841aa21094cbaf8f0eaa103309d6e65eb2330771da999489869976d`.

```powershell
node --test spec/reference/test-vectors.mjs spec/reference/test-consumer.mjs spec/public-evidence/test-publication.mjs spec/public-evidence/test-store.mjs
```

Exécuter à la racine du paquet avec Node.js 24.17.0 ou supérieur. Aucun secret, compte, dépôt privé ou installation de dépendances. Les tests réutilisent les vecteurs de conformité existants.

### Publication synthétique vérifiée localement

Publication: sha-256:e03c7c3249b4e7eba0b9115af3f7c68d71d7abab7b28e7256f24bfc25d8927bd.

Population: fixtures synthétiques seulement. Fenêtre UTC semi-ouverte: 2026-09-01 → 2026-09-07.

Ces lignes ne mesurent aucune activité de production. Les statuts du rapport et de la métrique sont distincts. null ne vaut pas zéro. Aucun total entre populations n’est calculé.

| UTC | Rapport | Métrique | Type | Valeur |
|---|---|---|---|---|
| 2026-09-01 | measured | measured | number | 9 |
| 2026-09-02 | measured_zero | measured_zero | number | 0 |
| 2026-09-03 | partial | measured | number | 7 |
| 2026-09-04 | not_measurable | not_measurable | null | null |
| 2026-09-05 | observation_unavailable | not_measurable | null | null |
| 2026-09-06 | not_applicable | not_applicable | null | null |

Unité: count. Formule: valeur de source sans agrégation. Dénominateur: non applicable. Couverture du profil: complete.

Filiation unique, aucune confirmation indépendante supplémentaire. La vérification de cette projection ne certifie ni complétude privée ni déploiement courant.
