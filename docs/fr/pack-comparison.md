# Comparer deux états identifiés d’un pack

[English](../en/pack-comparison.md) · [Qualification datée](../../records/comparison-2026-10-29.md) · [Décision d’identité](../../records/comparison-identity-decision-2026-10-29.md)

Le compagnon local facultatif compare B par rapport à A pour la même famille de pack, la même intention et la même langue. Choisissez explicitement les deux états, puis **Comparer B à A**. L’exemple conservé et un nouvel état fictif sont disponibles en français et en anglais. Cette opération ne transmet aucun contexte au modèle. Elle ne choisit pas le meilleur état et n’établit aucune succession officielle de publications.

L’admission contrôle d’abord une racine attendue fournie séparément, l’instantané complet et toutes les archives requises avec le vérificateur de référence inchangé. Le pack et le manifeste originaux subissent ensuite une validation complète contre les schémas draft-2020-12 épinglés, avec Ajv 8.20.0. Les formats ne sont pas assertés ; ce profil figure dans chaque identité. Intégrité, conformité au schéma, confiance dans les signatures et permission restent distinctes. Une entrée absente ou refusée ne devient jamais une comparaison vide réussie.

La vue regroupe les ajouts, retraits, valeurs modifiées et déplacements calculés. Chaque opération conserve ses emplacements A/B et ses valeurs complètes. Dépliez les groupes, filtrez par catégorie, inspectez les originaux ou exportez le JSON. Le filtre modifie seulement la visibilité. Le compteur porte sur les opérations structurales, pas sur des règles distinctes : une projection racine et son occurrence dans une chaîne restent séparées. Une phrase réécrite produit un retrait et un ajout. Les répétitions conservent leur multiplicité et les déplacements ambigus sont signalés. Aucun score de similarité ni reformulation sémantique n’intervient.

Le périmètre comprend le pack, le manifeste, les unités sélectionnées et les octets des sources archivées. Deux URL identiques n’établissent pas l’égalité des contenus. Le texte UTF-8 archivé reste consultable ; le base64 conserve les octets exacts. Aucune URL déclarée n’est récupérée. L’égalité de structure et l’égalité des octets sont distinctes ; aucune égalité d’empreinte n’est comparée entre portées inconnues. Pour la seule politique fictive Atelier Boréal, la cohérence de projection racine-chaînes est examinée séparément. Aucune équivalence avec les listes causales n’est supposée.

Chaque branche du delta brut doit être consommée ou provoquer un refus. Toutes les opérations normalisées figurent dans un groupe du rapport et un élément dépliable du rendu. Ni delta opaque, ni application automatique d’un patch, ni troncature, ni interprétation par modèle ne servent de solution de repli. Une opération inconnue provoque un refus. Erreur, annulation, sélection différente et déconnexion invalident le résultat ; une réponse tardive ne certifie pas une autre paire. La comparaison demande sa propre annulation et ne libère jamais le verrou indépendant d’une lecture entière en cours. L’hôte peut ne pas propager l’annulation ; le worker du serveur conserve sa limite de 10 secondes.

## Reproduction locale

Suivez les [instructions de préparation du compagnon](../../spec/examples/mcp-apps/README.fr.md) dans un nouveau dossier externe. Les dépendances verrouillées comprennent jsondiffpatch 0.7.6 et Ajv 8.20.0. Le paquet racine de référence n’acquiert aucune dépendance d’exécution.

Pour des archives privées, créez une configuration privée avec deux objets A et B. Chacun fournit snapshotPath, archivesDirectory, expectedRoot, rootProvenance, intentToken, lang et version. expectedIntentsPath peut désigner un tableau de registre admis séparément. Les racines proviennent d’un relevé indépendant ou d’une décision locale d’admission, jamais du pack non admis choisi. Les chemins sont relatifs à la configuration. Le dossier d’archives contient les enveloppes JSON nommées par empreinte ; aucune résolution réseau n’intervient.

Depuis l’artefact préparé, en conservant chemins et rapports privés :

```powershell
node comparison-cli.mjs 'C:\prive\paire.json' 'C:\prive\nouveau-rapport.json'
```

La sortie ne doit pas exister. L’export contient tous les originaux, y compris les sources archivées. Conservez les rapports réels dans le dossier privé autorisé. Le catalogue visuel expose uniquement les exemples fictifs fixes ; il ne constitue pas un service de téléversement privé. Si l’hôte bloque le téléchargement, le JSON complet demeure sélectionnable dans l’interface. L’hôte peut lire les métadonnées : elles ne constituent pas une frontière de confidentialité.

Les limites provoquent un refus explicite : instantané et archive de 8 Mio chacun, total des archives de 64 Mio, pack de 1 Mio, profondeur de 48, 50 000 nœuds visités, 1 000 éléments par tableau, 5 000 opérations et rapport de 8 Mio. Au plus deux workers exécutent les calculs, avec chacun un budget de tas ancien de 128 Mio et un délai de 10 secondes. Ce sont les bornes du prototype local, sans garantie de performance sur d’autres entrées.

## Contrat du rapport

L’enveloppe stable est gcr-comparison-report-1, le profil gcr-exact-occurrences-1 et le moteur de rendu gcr-comparison-cards-1. Le rapport déclare moteur/version, identités d’admission, périmètre, exclusions, dimensions d’égalité, opérations, rawCoverage, groups, presentationCoverage, coherence, originals, contexte complet, erreurs, ambiguïtés, editorialRelations et limites. Un rapport réussi porte le statut complete et une liste errors vide ; un échec ne produit aucun rapport réussi.

Les identifiants d’opération sont uniques dans ce rapport. Les types sont add, remove, replace et order. pathA/pathB sont des JSON Pointers échappés dans context.A/context.B ; un côté absent a un chemin null et aucune valeur, ce qui diffère d’une valeur JSON null. Un chemin sous /pack se résout avec l’empreinte des octets exacts, la langue, l’empreinte du schéma et la racine de ce côté. Chemin source et manifeste conservent le contexte de résolution. Identifiants d’opération et positions ne désignent aucune règle éditoriale persistante.

Chaque opération conserve sa méthode de rapprochement, son indicateur d’ambiguïté et les branches brutes correspondantes. rawCoverage couvre toutes les opérations brutes et le marqueur de tableau reconnu. presentationCoverage énumère exactement les mêmes identifiants uniques que operations et groups. Les marqueurs techniques ne comptent pas comme règles. Le contenu inchangé demeure disponible dans context. Aucune relation éditoriale n’est inventée : editorialRelations reste vide.

Les essais automatisés locaux et l’examen dans un hôte simulé qualifient l’implémentation. La comparaison réelle FR/EN conservée est un diagnostic hors ligne, sans nouvelle observation du service ou d’un client réel. T3 demeure inchangé. Une revue humaine et des documents organisationnels représentatifs seraient nécessaires pour mesurer un bénéfice pratique ; le pilote comparatif sur modèles reste NOT_RUN.
