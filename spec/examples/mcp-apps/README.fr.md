# Compagnon GCR MCP Apps

Ce dossier contient les sources isolées d’un prototype local fictif. Il ne constitue pas un service Runtime hébergé. Lire le [guide français](../../../docs/fr/mcp-apps.md) ou le [English guide](../../../docs/en/mcp-apps.md) avant de connecter un client.

Ne pas lancer npm install ici. Préparer un artefact d’exécution hors du checkout avec `prepare.mjs`, puis y installer le lockfile propre au compagnon. Le paquet de référence conserve sa politique de dépendances et ses archives.

## Comparaison préparée le 29 octobre

Après reconstruction de l’artefact, déplier « Comparer deux états de pack ». Le [guide](../../../docs/fr/pack-comparison.md) documente le catalogue fictif, l’export complet et la commande privée hors ligne. Les dépendances de comparaison sont confinées à cet artefact facultatif.

## Publication Web autonome

Après la construction du compagnon, exécuter `node web-build.mjs` dans l’artefact matérialisé depuis une source propre. Le [relevé de publication Web](../../../records/comparison-web-2026-10-29.md) distingue les rapports fictifs précompilés du serveur MCP local.
