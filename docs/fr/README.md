# Runtime de contexte gouverné

[Utiliser l’instance hébergée : accès REST/MCP et contrôle daté](instance.md)

**Donner aux agents IA un contexte qu’ils peuvent vérifier.**

Un assistant confond la politique explicative d’un atelier fictif avec une permission d’agir. Sélectionner representation-gap et une langue, identifier le pack déclaré, puis vérifier sa version et ses limites avant de le fournir comme contexte. La démonstration effectue les vérifications sans appeler d’agent.

```powershell
npm run demo
npm test
```

Node.js 24.17.0 ou supérieur. Exécuter à la racine du dépôt. État final attendu de la démonstration : `VERIFIED_FICTIONAL_CONTEXT`.

![Le consommateur choisit l’intention et la langue. Le runtime distribue le pack précompilé. La vérification et la permission restent locales au consommateur. L’agent produit sa réponse ; toute évaluation externe de cette réponse constitue une étape distincte.](../../assets/architecture.fr.svg)

Le consommateur choisit l’intention et la langue. Le runtime distribue le pack précompilé. La vérification et la permission restent locales au consommateur. L’agent produit sa réponse ; toute évaluation externe de cette réponse constitue une étape distincte.

## L’interface

Une interface déterministe qui distribue un pack de contexte précompilé pour une intention canonique déjà sélectionnée par un consommateur. Elle ne déduit pas l’intention d’un texte libre, ne compose pas de pack à la requête, ne génère pas de réponse et ne juge pas un modèle.

## Portée de l’instance

Cette référence implémente les contrats de l’instance gautierdorval.com, avec son vocabulaire fermé d’intentions et ses identifiants historiques. Le site demeure la source canonique de sa doctrine. Le dépôt public explique et teste ces contrats sans créer une nouvelle racine d’autorité.

## Version de référence

Édition de référence 0.2.0-proposed. Les contrats demeurent proposés. Le paquet contient le code de référence hors ligne et des exemples fictifs, sans service hébergé ni corpus de production.

## Choisir le contexte

Sélectionner representation-gap lorsqu’une réponse de modèle déjà identifiée semble déformer la représentation de l’entité ou de la doctrine publiée. Choisir explicitement la langue. Lire le registre fermé, sélectionner l’identité exacte du pack et lier son contenu et son manifeste détaché à une racine de corpus épinglée séparément avant utilisation.

## Exécuter l’exemple

Exécuter npm run demo à la racine du paquet. Le jeu d’essai fictif fournit un reçu signé, une politique de clé publique de test, la racine attendue, l’instantané et toutes les archives nécessaires. L’horloge fixe appartient à l’exercice, sans prouver une fraîcheur actuelle. Aucune installation, aucun compte privé, téléchargement ou appel à un modèle n’est requis. Pour un usage réel, obtenir séparément la racine attendue et la politique de clés.

## Permission locale

La vérification établit l’intégrité des octets selon le format déclaré. Le consommateur prend ensuite sa propre décision de permission bornée. Une signature JWS valide ne prouve ni vérité, ni identité réelle, ni fidélité du modèle, ni autorité d’exécution, ni état ultérieur de révocation. DSSE et JWS détaché sont des formats distincts.

## Limite d’intégrité unitaire

Vérifier l’instantané complet avant d’utiliser une unité. L’enveloppe historique v0 couvre les champs textuels et contextuels énumérés, mais pas la valeur source sélectionnée, son type ni les transformations permises et interdites. Leurs octets sources et leurs registres sont couverts séparément par l’instantané épinglé. Cela établit l’intégrité, sans prouver que la phrase exprime correctement le sens de la source. Aucun juge sémantique ne s’exécute dans le runtime.

## Signatures historiques

L’inspection historique d’une signature ne permet pas d’autoriser un usage courant. Le parcours consommateur revérifie toujours le reçu original en mode courant selon sa politique locale. Une date signée par la même clé ne constitue pas un témoin temporel indépendant. Une clé retirée ne peut autoriser un usage courant ; une clé révoquée est refusée même pour l’historique. Une politique hors ligne ne permet pas d’établir une compromission ultérieure.

## Quand une page suffit

Une page canonique statique suffit pour une définition simple ou une citation éditoriale ordinaire. Le pack est utile lorsque le consommateur a besoin de la sélection déclarée, de ses dépendances et de leur portée d’intégrité ensemble. Sa forme ne lui confère aucune autorité supplémentaire.

## Preuves

Séparer mesures opérationnelles, vérification technique locale et expériences externes sur des modèles. Data, une projection publique, cette documentation et un paragraphe du site peuvent décrire la même archive. Ce ne sont pas quatre confirmations indépendantes.

## Limites

L’exemple de preuve publique inclus est synthétique. Son empreinte permet de contrôler l’intégrité du contenu projeté ; elle n’authentifie pas sa source. La complétude de la source privée, le déploiement courant, l’adoption spontanée et les effets causaux sur les réponses de modèles ne sont pas établis.

![La racine et la politique de clés épinglées localement précèdent la vérification du reçu. L’instantané complet lie ensuite archives, profils, identités de packs, références d’unités, octets sources et registres de transformations. Les deux étapes doivent réussir avant l’inspection locale. La référence de confiance fournie reste pédagogique.](../../assets/verification.fr.svg)

La racine et la politique de clés épinglées localement précèdent la vérification du reçu. L’instantané complet lie ensuite archives, profils, identités de packs, références d’unités, octets sources et registres de transformations. Les deux étapes doivent réussir avant l’inspection locale. La référence de confiance fournie reste pédagogique.

[Verification](../verification.md) · [Schemas](../schemas.md) · [Evidence](../../evidence/README.md) · [Security](../../SECURITY.md) · [Rights](../../NOTICE.md)
