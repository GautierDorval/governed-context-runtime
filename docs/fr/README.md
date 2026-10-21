# Runtime de contexte gouverné

**Donner aux agents IA un contexte qu’ils peuvent vérifier.**

Le Runtime de contexte gouverné distribue des packs de contexte précompilés et versionnés, avec leurs sources et leurs limites d’interprétation, pour une tâche déclarée. Le consommateur choisit une intention canonique. L’interface ne déduit pas l’intention d’un texte libre, ne compose pas de pack à la requête, ne génère pas de réponse et ne juge pas un modèle.

[Ouvrir l’instance hébergée](https://context.gautierdorval.com/). L’instance de gautierdorval.com est accessible par HTTP et un adaptateur MCP distinct. Ce dépôt public fournit les contrats proposés, les vérificateurs, les guides d’intégration et des exemples exécutables hors ligne pour cette instance, avec son vocabulaire fermé d’intentions et ses identifiants historiques. Le site demeure la source canonique de sa doctrine. Cette référence ne crée aucune nouvelle racine d’autorité.

## Ce qui est utilisable aujourd’hui

| Votre objectif | Ressource disponible | Portée |
|---|---|---|
| Obtenir un contexte déclaré | [Guide de l’instance hébergée](instance.md) | Corpus de gautierdorval.com, avec compatibilité des clients documentée séparément. |
| Examiner et vérifier les artefacts | [Guide de vérification](../verification.md) | Vérification complète de l’instantané sous une référence de confiance choisie séparément. |
| Apprendre le parcours hors ligne | [Démonstration locale](#essayer-localement) | Données fictives et clés de test, sans appel à un modèle. |
| Inspecter un pack complet | [Kit consommateur](reproduction.md) | Admission, inspection et permission restent distinctes. |
| Comprendre les limites sémantiques | [Exemple et glossaire](pack-semantics.md) | Exercice fictif, sans réponse de modèle observée. |
| Examiner les preuves locales | [Qualification](qualification.md) | Actifs conservés et adaptateur local, sans diagnostic hébergé courant. |
| Préparer une comparaison | [Pilote à quatre conditions](../model-comparison.md) | 560 réponses prévues par configuration, **NOT_RUN**. |

## Quand le contexte perd son sens

Exemple fictif : « Disponible au Québec après validation technique » est résumé en « Disponible au Canada ». Le service est reconnaissable, mais une condition et le périmètre géographique ont changé. Le projet explore comment fournir les sources et les limites de contexte sous une forme identifiable et vérifiable avant d’évaluer ce que l’agent en restitue. Cet exemple ne décrit ni un résultat de modèle observé, ni un pack métier disponible.

Chaque pack est déclaré pour une tâche, porte une version reproductible et rend explicites ses limites d’interprétation. Le consommateur peut examiner le contexte reçu avant de l’utiliser. La fidélité de la réponse produite par l’agent s’évalue séparément.

## De la sélection à l’utilisation

![Le consommateur choisit l’intention et la langue. Le runtime distribue le pack précompilé. La vérification et la permission restent locales au consommateur. L’agent produit sa réponse ; toute évaluation externe de cette réponse constitue une étape distincte.](../../assets/architecture.fr.svg)

Le consommateur choisit l’intention et la langue. Le runtime distribue le pack précompilé. La vérification et la permission restent locales au consommateur. L’agent produit sa réponse ; toute évaluation externe de cette réponse constitue une étape distincte.

## Portée de l’instance

L’instance de gautierdorval.com est accessible par HTTP et un adaptateur MCP distinct. Ce dépôt public fournit les contrats proposés, les vérificateurs, les guides d’intégration et des exemples exécutables hors ligne pour cette instance, avec son vocabulaire fermé d’intentions et ses identifiants historiques. Le site demeure la source canonique de sa doctrine. Cette référence ne crée aucune nouvelle racine d’autorité.

## Version de référence

L’édition de référence 0.2.1-proposed est préparée comme candidate, sans publication étiquetée à ce stade. Les contrats restent proposés et le service hébergé suit un cycle de publication distinct. Citer le commit exact exécuté tant que cette édition n’est pas publiée. Ce dépôt contient le code de référence hors ligne et des exemples fictifs, sans regrouper le service hébergé, son corpus de production ou un déploiement clé en main pour d’autres domaines.

## Choisir le contexte

Sélectionner representation-gap lorsqu’une réponse de modèle déjà identifiée semble déformer la représentation de l’entité ou de la doctrine publiée. Choisir explicitement la langue. Lire le registre fermé, sélectionner l’identité exacte du pack et lier son contenu et son manifeste détaché à une racine de corpus épinglée séparément avant utilisation.

## Essayer localement

La démonstration existante porte sur un atelier fictif et la distinction entre une politique explicative et une permission d’agir.

Exécuter npm run demo à la racine du paquet pour l’exercice hors ligne. Son jeu d’essai fictif fournit un reçu signé, une politique de clé publique de test, la racine attendue, l’instantané et toutes les archives nécessaires. L’horloge fixe appartient à l’exercice, sans prouver une fraîcheur actuelle. Aucune installation, aucun compte privé, téléchargement ou appel à un modèle n’est requis. Pour l’instance hébergée, suivre le guide d’intégration et choisir séparément une racine de corpus attendue. Les clés de la démonstration n’établissent pas une infrastructure de signature de production.

```powershell
npm run demo
npm test
```

Node.js 24.17.0 ou supérieur. Exécuter à la racine du dépôt. État final attendu de la démonstration : `VERIFIED_FICTIONAL_CONTEXT`.

## Permission locale

La vérification établit l’intégrité des octets selon le format déclaré. Le consommateur prend ensuite sa propre décision de permission bornée. Une signature JWS valide ne prouve ni vérité, ni identité réelle, ni fidélité du modèle, ni autorité d’exécution, ni état ultérieur de révocation. DSSE et JWS détaché sont des formats distincts.

## Limite d’intégrité unitaire

Vérifier l’instantané complet avant d’utiliser une unité. L’enveloppe historique v0 couvre les champs textuels et contextuels énumérés, mais pas la valeur source sélectionnée, son type ni les transformations permises et interdites. Leurs octets sources et leurs registres sont couverts séparément par l’instantané épinglé. Cela établit l’intégrité, sans prouver que la phrase exprime correctement le sens de la source. Aucun juge sémantique ne s’exécute dans le runtime.

## Signatures historiques

L’inspection historique d’une signature ne permet pas d’autoriser un usage courant. Le parcours consommateur revérifie toujours le reçu original en mode courant selon sa politique locale. Une date signée par la même clé ne constitue pas un témoin temporel indépendant. Une clé retirée ne peut autoriser un usage courant ; une clé révoquée est refusée même pour l’historique. Une politique hors ligne ne permet pas d’établir une compromission ultérieure.

## Applications à explorer

| Application envisagée | Besoin de contexte | Ce qui reste à éprouver |
|---|---|---|
| Assistants métier et documentation | Fournir une offre, une définition ou une politique avec ses conditions, exclusions et sources. | Corpus métier adapté, coût d’intégration et préservation des conditions dans les réponses. |
| Systèmes multiagents | Identifier la version de contexte transmise entre étapes et conserver ses références. | Transmission réelle des contraintes, gestion des résumés et des versions par les consommateurs. |
| Audit de réponses IA | Relier un essai au contexte fourni, puis comparer la réponse à ses conditions. | Captures externes, protocole d’évaluation et résultats comparatifs. |

Ces applications restent à explorer, sans intégration déployée revendiquée. Le service actuel conserve son catalogue d’intentions déclaré. Ces exemples n’ajoutent aucun pack, aucune intégration native ni disponibilité commerciale.

## Quand une page suffit

Une page canonique statique suffit pour une définition simple ou une citation éditoriale ordinaire. Le pack est utile lorsque le consommateur a besoin de la sélection déclarée, de ses dépendances et de leur portée d’intégrité ensemble. Sa forme ne lui confère aucune autorité supplémentaire.

## Preuves

Séparer les observations datées du producteur sur l’instance hébergée, la vérification technique locale et les expériences externes sur des modèles. Une archive de données, une projection publique, cette documentation et un paragraphe du site peuvent décrire la même archive. Ce ne sont pas quatre confirmations indépendantes. Les effets sur la fidélité des réponses restent à évaluer.

[Observations datées et portée des preuves](../../evidence/README.md)

## Limites

La publication evidence/publication.json est synthétique. Son empreinte permet de vérifier l’intégrité de cette projection ; elle n’authentifie pas sa source et ne mesure pas l’instance hébergée. Les observations datées du producteur sur cette instance sont publiées séparément. Cette projection n’établit ni la complétude de la source privée, ni le déploiement courant, ni l’adoption spontanée, ni les effets causaux sur les réponses de modèles.

![Dans la démonstration fictive, une racine et une politique de clé de test épinglées localement précèdent la vérification du reçu. L’instantané complet lie ensuite archives, profils, identités de packs, références d’unités, octets sources et registres de transformations. Les deux étapes doivent réussir avant l’inspection locale. La référence de confiance fournie est pédagogique, sans constituer un service de signature de production.](../../assets/verification.fr.svg)

Dans la démonstration fictive, une racine et une politique de clé de test épinglées localement précèdent la vérification du reçu. L’instantané complet lie ensuite archives, profils, identités de packs, références d’unités, octets sources et registres de transformations. Les deux étapes doivent réussir avant l’inspection locale. La référence de confiance fournie est pédagogique, sans constituer un service de signature de production.

[Vérification](../verification.md) · [Schémas](../schemas.md) · [Preuves](../../evidence/README.md) · [Sécurité](../../SECURITY.md) · [Droits](../../NOTICE.md)

## Inspection locale du pack complet

[Kit de reproduction](reproduction.md) · [Sémantique des packs](pack-semantics.md) · [Protocole comparatif préparé](../model-comparison.md).

[Qualification hors ligne](qualification.md) · [Contrats des observations](observations.md) · [Diagnostic hébergé](hosted-diagnostics.md) · [Édition candidate](../release-0.2.1-proposed.md). Le pilote à quatre conditions reste **NOT_RUN**.
