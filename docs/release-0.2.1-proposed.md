# Edition candidate 0.2.1-proposed

This is a prepared reference edition, not a published release. It starts from public commit `441598c279832b5521c952de920966a486d79026`. Cite the exact reviewed commit until an actual release exists. No candidate release date or tag is asserted.

## Edition and compatibility

Package, lockfile (both version locations), package manifest, documentation source and `CITATION.cff` identify `0.2.1-proposed`. The manifest format and historical public specification remain `0.2.0-proposed`; `SCHEMA_EDITION`, four historical schemas, recipes, vectors, synthetic bundles and roots are unchanged. MCP protocol versions and the real health object's `schemaVersion: 0.2.0` name different contracts.

This patch edition carries the already merged strict archive acceptance correction and completes its qualification and documentation. It narrows acceptance to the declared archive format; malformed or previously tolerated representations are rejected. It does not claim every prior input remains accepted. See the [P3 record](../records/archive-profile-p3-2026-10-20.md) and [SemVer rules](https://semver.org/).

The historical `v0.2.0-proposed` tag remains attached to commit `ed69a02a83bd0eae53e0755f01d5ea77c4529a65`. It must never be moved. A future tag/release requires a separate owner decision and an immediate check that its identity is unused.

## Changes and evidence

Since the old tag, the reference also gained the complete-pack consumer, bounded MCP JSON/SSE reader, observation contracts and offline reproduction kit, with refusal and tampering controls. These earlier merged changes are described in the [consumer delivery record](../records/consumer-report-2026-10-20.md); their dates and audit attributions remain historical.

- [Offline qualification](en/qualification.md): 11 retained real snapshots, 132 exact pack selections, one local discovery exchange and 12 pack exchanges against the real adapter. Canonical transport bytes and repository file bytes are explicitly distinct.
- A pure local lifecycle comparison has seven passing controls. New hosted diagnostics and reconciliation of six declared audit requests remain `NOT_RUN`.
- Consumer guides remain separate from the dated [delivery records](../records/README.md). French observation and diagnostic guides now accompany their English versions.
- The [four-condition pilot](en/model-comparison.md) adds canonical prose and a documentation-free control. It prepares 560 responses per future configuration, two reviewers and bounded analysis; models, judgments and external reproduction remain `NOT_RUN`.

No historical observation, production state, public signing service, model-fidelity result or independent external reproduction is newly asserted. Private assets and code remain private; published hashes identify retained evidence without making it independently reproducible.

## Citation and rights

`CITATION.cff` carries the candidate edition without `date-released` or a single global `license` field. File-level rights remain governed by [NOTICE](../NOTICE.md) and [rights.json](../rights.json). No licence text or reserved visual changes. Add a release date only after actual publication, and review its declaration digest explicitly; regeneration does not approve a declaration.

## Version française

Cette édition `0.2.1-proposed` reste **candidate**. La base est le commit public indiqué ci-dessus ; citer le commit effectivement examiné jusqu’à une publication réelle. Aucune date de release ni nouvelle étiquette n’est déclarée. L’ancienne étiquette garde sa cible.

Les métadonnées d’édition sont synchronisées. Les versions de format, schémas historiques, recettes, vecteurs, bundles, racines et observations demeurent inchangés. La correction P3 resserre l’acceptation des archives sur leur format déclaré : certaines représentations auparavant tolérées sont refusées. Cela ne signifie pas une compatibilité universelle de toutes les anciennes entrées.

La [qualification locale](fr/qualification.md) couvre 11 snapshots et 132 sélections, ainsi que 13 échanges locaux avec l’adaptateur réel. Sept contrôles lifecycle réussissent. Le diagnostic hébergé et le rapprochement des six requêtes déclarées restent `NOT_RUN`. Les guides sont séparés des [journaux datés](../records/README.md).

Le [pilote à quatre conditions](model-comparison.md) prépare 560 réponses par configuration, deux évaluateurs, l’accord brut et le kappa de Cohen. Il ne contient aucune réponse observée, aucun score ni appel de modèle. La reproduction externe reste `NOT_RUN`.

La citation conserve la répartition des droits par fichier, sans date de publication anticipée. Aucun actif privé, texte de licence ou visuel réservé n’est modifié. Une fusion, une étiquette ou une release relève d’une décision ultérieure distincte.
