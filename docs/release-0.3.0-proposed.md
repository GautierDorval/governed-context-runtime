# Reference prerelease 0.3.0-proposed

This edition groups the changes integrated after `v0.2.1-proposed` through `eaca7780e56a02457269fd72f03a4eb10abd8638`, plus the edition metadata reviewed for this publication. The planned UTC publication date is **2026-11-01**. The remote tag and GitHub prerelease establish actual publication; this document and the CFF date do not. Cite `v0.3.0-proposed` together with the exact executed commit.

## Included changes

- Optional [MCP Apps companion](en/mcp-apps.md), with bounded complete-pack reading, separate diagnostics and a text-tool reading path. Its dependencies, build and client qualification remain separate from the dependency-free reference verifier.
- [Pack comparison](en/pack-comparison.md) with separate admission and schema validation, exact-occurrence matching, retained original bytes, complete normalized export, bounded workers and a bilingual Web view.
- [Runtime discovery](en/instance.md#discovery-declaration-and-pinned-editions), public declaration contracts 0.3.0 and 0.4.0, schema locators and distinct documentation/source provenance. Dual Web and diagnostic nonce explanations retain their precise scopes.
- [Development property campaigns](property-testing.md) with fixed seeds, independent witnesses, controlled mutations and a Python 3.14.9 oracle. Development dependencies remain outside the runtime path.
- Local policy characterization and consolidation of retained T3 evidence, preserving the recorded observations and their attribution limits.

The source integrations are recorded in PRs [10](https://github.com/GautierDorval/governed-context-runtime/pull/10), [12](https://github.com/GautierDorval/governed-context-runtime/pull/12), [13](https://github.com/GautierDorval/governed-context-runtime/pull/13), [14](https://github.com/GautierDorval/governed-context-runtime/pull/14), [15](https://github.com/GautierDorval/governed-context-runtime/pull/15), [16](https://github.com/GautierDorval/governed-context-runtime/pull/16), [17](https://github.com/GautierDorval/governed-context-runtime/pull/17), [18](https://github.com/GautierDorval/governed-context-runtime/pull/18), [19](https://github.com/GautierDorval/governed-context-runtime/pull/19) and [20](https://github.com/GautierDorval/governed-context-runtime/pull/20). Their earlier review and CI results do not substitute for verification of this edition's final commit and archive.

## Version and compatibility boundaries

The minor reference edition groups additive public capabilities. It does not align the hosted software version, the declaration's schemaVersion, individual pack versions or Cloudflare deployment revision numbers. The hosted Runtime implementation is maintained separately; publishing this archive does not activate or deploy a service.

The four historical Runtime schemas, attestation recipes, reference verifier/consumer, existing format identifiers, synthetic bundles and their roots retain their bytes from the previous release. Declaration 0.4.0 is a separate closed contract: a consumer limited to 0.3.0 must explicitly adopt the applicable contract. Existing tags and downloadable release archives are preserved. No universal compatibility or maturity promotion is claimed.

`proposed` remains the contract status. Demo signatures remain test-only. The four-condition scientific pilot remains **NOT_RUN**. Recorded client observations and retained T3 evidence establish their stated, dated scopes; they do not establish general model fidelity, causal improvement or independent external adoption.

## Verification and distribution

Use Node 24.17.0 for parity with CI. Run `npm test` and `npm run regenerate:check` without installing runtime dependencies. For development checks, install the exact lockfile with `npm ci --ignore-scripts`, provide Python 3.14.9, then run `npm run test:dev`. Materialize and validate the optional companion outside this checkout as described in its guide.

The final release receipt records the exact commit/tree, CI run, independent review, archive inventory and SHA-256 checksums outside these source bytes. The source archive must match that commit file by file and contain only the inventoried public files. An unexecuted check is not a passing result. [Maintenance](../MAINTAINING.md#preparing-a-reference-edition) describes the edition and date gates; [NOTICE](../NOTICE.md) and [rights.json](../rights.json) retain file-specific rights.

## Synthèse française

L’édition **0.3.0-proposed** regroupe le compagnon MCP Apps facultatif, la lecture de packs complets, les diagnostics séparés, la comparaison exacte de packs et sa vue Web FR/EN, les clarifications Dual Web et de découverte, ainsi que les campagnes de tests génératifs. Les intégrations sources précèdent cette préparation de version. L’étiquette distante, la release et son reçu final attestent la publication effective.

Cette édition de référence suit son propre cycle. Elle ne modifie pas les services hébergés, leurs révisions Cloudflare, la version du contrat de déclaration ou celle des packs. Les schémas historiques, recettes, vérificateurs, consommateurs, exemples synthétiques et anciennes publications conservent leurs octets. Les nouveaux contrats fermés exigent une sélection explicite du consommateur.

Les contrats restent **proposés**, les signatures de démonstration restent réservées aux tests et le pilote scientifique à quatre conditions demeure **NOT_RUN**. Les preuves T3 et les observations de clients gardent leurs dates, leur attribution et leurs limites. Elles ne deviennent pas une preuve générale de fidélité des modèles ou d’amélioration causale.

Les [guides FR](fr/README.md), [comparaison](fr/pack-comparison.md), [instance](fr/instance.md) et [reproduction](fr/reproduction.md) détaillent les usages et leurs limites. La date UTC prévue est le **1er novembre 2026** ; si la publication est reportée, ses métadonnées et leurs contrôles doivent être révisés avant la création de l’étiquette. Aucune ancienne étiquette ni archive n’est réécrite.
