# Exécution du pilote avec fournisseurs

[English](../en/provider-pilot.md) · [Protocole scientifique](../model-comparison.md)

Le moteur optionnel exécute le protocole existant `four-condition-pilot-3`. Il est distinct du transport de packs du Runtime hébergé et de son vérificateur d’admission. Son ajout ne fait pas sélectionner une intention, produire une réponse ou imposer la conformité d’un modèle au Runtime.

La première configuration approuvée utilise Anthropic `claude-haiku-5-5` comme répondant, puis DeepInfra `deepseek-ai/DeepSeek-V3.2` et Mistral `mistral-large-4-0` comme deux juges automatiques distincts. Leur budget fournisseur commun est plafonné à 50 USD, essais techniques préalables et reprises compris. Il s’agit d’une limite de dépense, pas d’un coût annoncé ou observé. Le plan figé reste un modèle réutilisable `NOT_RUN` ; un résultat de campagne distinct établit une exécution réelle `RUN`. Un transport simulé produit uniquement `SYNTHETIC_RUN`.

## Frontière des requêtes et réponses

Le répondant reçoit le message assemblé exact dans un seul message utilisateur, avec un plafond de sortie de 512 jetons, sans outil, recherche, instruction système ni identifiant de condition. La documentation ne devient jamais un message système. Le raisonnement Haiku est désactivé et l’effort réglé à medium ; les paramètres non pris en charge de température, top-p et graine sont omis. Les juges reçoivent le message réel, la réponse reçue et la grille applicable, sans annotation de leur pair. DeepInfra et Mistral utilisent une température de 0 et top-p de 1 ; Mistral utilise un effort de raisonnement high et le service standard_only. Les corps et paramètres exacts sont conservés dans les preuves privées.

Chaque tentative effectue un seul envoi HTTP borné vers l’URL fixe de son fournisseur. Les redirections, l’UTF-8 invalide, les clés JSON dupliquées, une autre identité de modèle, les formes de réponse non prises en charge, appels d’outils, usages incohérents et motifs de fin inconnus sont refusés. Les messages d’exception et en-têtes ne sont pas copiés dans les traces. Les clés proviennent des secrets et sont exclues des corps de requêtes et de réponses conservés, y compris les échos littéraux ou échappés en JSON.

Une réponse terminée vide, composée d’espaces, refusée ou limitée en sortie conserve son contenu brut et son motif de fin. Elle n’est jamais reprise pour obtenir une meilleure réponse. Une erreur technique conserve séparément les octets partiels disponibles et ne reçoit aucun jugement sémantique. Une seule reprise technique admissible se produit après le premier passage prévu, avec la même entrée et la même identité d’essai. Un jugement terminé mais invalide reste rejeté ; aucune consigne de réparation automatique n’est envoyée.

## Exécution durable et budget

Cloudflare Workflows mémorise les étapes bornées ; ses reprises automatiques sont désactivées. R2 conserve les entrées, requêtes, résultats, annotations et journaux immuables. Un registre budgétaire à écritures conditionnelles couvre les trois fournisseurs. Avant l’envoi HTTP, il réserve une borne conservatrice correspondant au contexte maximal d’entrée et au plafond de sortie, avec une arithmétique décimale exacte arrondie vers le haut. L’usage vérifié libère la différence avec une borne tarifaire conservatrice. Un coût inconnu conserve toute la réserve. Ces montants ne sont pas des factures.

Une réservation sans résultat conservé ne peut pas être renvoyée sous le même identifiant de tentative. Un résultat conservé avant une interruption permet de régler la réservation sans nouvel envoi. Un échec de stockage, une autorisation expirée ou le plafond budgétaire arrêtent l’exécution. Trois essais techniques, un par modèle, précèdent les 560 essais et utilisent le même registre. L’échec d’un essai préalable arrête la campagne.

Le paquet d’exécution épingle le commit source, l’empreinte du Worker, les neuf entrées du protocole, les preuves de métadonnées, la vérification des prix, l’autorisation propriétaire et son expiration. Métadonnées et prix doivent dater de moins de 72 heures à l’admission. Le paquet devient immuable au lancement. Un paquet corrigé exige une autre identité de campagne ; modifier les octets stockés ne peut pas reprendre silencieusement la campagne initiale.

`scripts/prepare-pilot.mjs` prépare ce paquet privé hors ligne depuis les entrées révisées. Il ne téléverse rien et n’appelle aucun fournisseur. La destination doit être hors du paquet public et ne pas encore exister. Ses arguments sont `--campaign`, `--preflight`, `--token-measurements`, `--bundle`, `--source-commit`, `--expires`, `--pricing-verified`, `--authorization` et `--output`. La préparation valide le paquet, mais ne certifie pas indépendamment ses métadonnées et n’autorise aucun lancement.

## Jugements et résultats

Les deux annotations originales restent séparées. Le validateur impose l’applicabilité, des extraits exacts de la réponse et la priorité de traitement des réponses vides. Les comptes descriptifs conservent le cas, la langue, la condition, la dimension et le juge, y compris les annotations valides sans paire. `evaluable` signifie PASS ou FAIL pour la dimension applicable ; `notEvaluable` signifie UNSCORABLE. Jugements manquants et NOT_APPLICABLE restent distincts. Aucun score global d’évaluabilité ou de qualité n’est inventé.

L’accord utilise seulement les annotations appariées, avec tables de contingence, marges, accord observé, accord attendu et kappa de Cohen avant arbitrage. Le kappa reste null sans paire ou lorsque l’accord attendu vaut un. Aucune annotation manquante ou rejetée n’est imputée. Les métadonnées conservent l’appariement cas/langue/répétition entre conditions. Sept cas d’un service fictif ne démontrent ni une supériorité générale d’architecture ni un effet du vérificateur.

## Exploitation privée et preuves

Le Worker n’a aucune route publique ni exposition workers.dev. Son lecteur `/internal/pilot-status`, accessible par liaison de service, expose seulement l’identité épinglée de la campagne, la version du Worker, les comptes de tentatives, les réserves et l’heure d’activité. L’Observatoire consomme cet agrégat par liaison privée sous ses contrôles Access existants. Une autre campagne, un autre manifeste ou une autre version déployée sont refusés. Trente minutes sans activité enregistrée donnent un statut périmé ; ce contrôle d’activité ne prouve pas l’état du Workflow dans le plan de contrôle.

Messages, réponses et jugements bruts restent dans R2 privé et dans l’état privé des étapes Workflow. Le moteur n’active aucune suppression automatique, export public brut ou alerte par courriel. La conservation Workflow suit la configuration de la plateforme ; les preuves R2 restent conservées jusqu’à une action de rétention autorisée séparément. Les preuves finales distinguent tests locaux, observations réelles des fournisseurs, déploiement, progression et analyse terminée. Voir le [relevé d’implémentation daté](../../records/provider-pilot-2026-11-07.md).
