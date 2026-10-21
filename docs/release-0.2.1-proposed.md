# Reference prerelease 0.2.1-proposed

This is the reference package for `v0.2.1-proposed`, with publication scheduled for **2026-10-21 UTC** by the owner's explicit decision. The remote tag and GitHub prerelease establish actual publication; this source file does not. Cite that tag and the exact executed commit. Contracts remain proposed and the hosted service has a separate lifecycle.

## Edition and compatibility

Package, both lockfile version fields, package manifest, documentation source and `CITATION.cff` identify `0.2.1-proposed`. Historical format identifiers remain `0.2.0-proposed`; schemas, recipes, vectors, synthetic bundles and roots are unchanged. MCP versions and the real health object's historical `schemaVersion: 0.2.0` name different contracts.

This patch edition includes strict archive acceptance: extra or missing fields and noncanonical base64 are refused. It narrows accepted input representations and makes no universal backward-compatibility claim. See the [P3 record](../records/archive-profile-p3-2026-10-20.md). The old `v0.2.0-proposed` tag remains at `ed69a02a83bd0eae53e0755f01d5ea77c4529a65`; no existing tag may move.

## Changes and evidence

- Complete-pack consumer, bounded MCP JSON/SSE reader, observation contracts and offline reproduction kit, preserving their [historical attribution](../records/consumer-report-2026-10-20.md).
- [Local qualification](en/qualification.md) of 11 retained real snapshots and 132 exact selections, plus one discovery and 12 pack exchanges through the retained real adapter without network calls. Canonical transport bytes and original file bytes remain distinct. Private corpus evidence was not independently inspected by the public-code reviewer.
- Seven local lifecycle controls. New hosted diagnostics, reconciliation of the six declared audit requests and independent external reproduction remain `NOT_RUN`.
- Bilingual reader guides and dated records with distinct scopes.
- [Four-condition pilot](en/model-comparison.md), protocol `four-condition-pilot-3`: 560 planned responses per future configuration, two reviewers, no observed model responses or scores.

## Closure of the four review observations

1. **O1, source wording:** FR/EN prose now states the source's territory and eligibility restrictions directly, without the scenario-specific favourable-assessment formulation. Source, packs and exhaustive texts remain unchanged; prose identities and coverage are refreshed.
2. **O2, protocol guards:** tests pin opaque trial identity, all external metadata fields and structured accounting of completed empty, token-limited and transport-partial responses. The pure prompt assembler still excludes that metadata; no execution engine is added.
3. **O3, shared judgment:** the rubric is canonical for empty/truncated responses. Applicability comes first. Empty completed answers yield `UNSCORABLE` on applicable dimensions and `UNDETERMINED` utility. Visible violations and required omissions in nonempty truncated answers fail; uninterpretable fragments are unscorable only without a visible failure. No continuation is inferred and no completed answer is retried.
4. **O4, release date:** these notes and [MAINTAINING](../MAINTAINING.md#preparing-a-reference-edition) now agree: before the release commit/tag, set the effective UTC date, review the edition-specific checker, refresh the CFF declaration digest, regenerate, validate and audit. Recheck the date if publication is postponed. Never fill in metadata by moving a published tag.

The prior Claude PASS concerns `f3d68f5edb81d6c2eea79d83f3fedf29dd6a340e`, merged as `962a97576c477b5233271d30256718c60f374430`. The new final review, CI, commit and archive identities belong in the release receipt outside these source bytes; historical results are not relabelled as this release's audit.

## Citation, rights and independent review

CFF carries the reviewed date `2026-10-21` and deliberately omits a global `license` field. [NOTICE](../NOTICE.md) and [rights.json](../rights.json) retain file-specific rights; no licence text or reserved visual changes. Date consistency is a metadata check, not proof of publication.

For an independent review, inspect the exact released commit/archive, this note, `MAINTAINING.md`, the verifier/consumer paths, `scripts/qualify-offline.mjs`, the four-condition assets and their tests. With Node 24.17.0, run `npm test`; for format/type/schema checks, install locked development dependencies using `npm ci --ignore-scripts` and run `npm run test:dev`. Keep installations distinct from offline test execution. Report reproducible defects with path, condition and expected/observed behavior; distinguish `VERIFIED`, `REFUTED` and `NOT_VERIFIABLE`. Do not contact the hosted Runtime, owner sites or research surfaces, invoke experimental models/judges, or request private assets to fill evidence gaps.

## Version française

Cette préversion de référence `0.2.1-proposed` est préparée pour publication le **21 octobre 2026 UTC**, suivant la décision explicite du propriétaire. L’étiquette distante et la release GitHub attestent la publication effective. Citer l’étiquette et le commit exact exécuté. Les contrats restent proposés ; le service hébergé suit un cycle distinct.

La qualification locale couvre 11 snapshots, 132 sélections et 13 échanges locaux avec l’adaptateur réel. Sept contrôles de cycle de vie réussissent. Le corpus privé n’a pas été inspecté indépendamment par le relecteur du code public. Les diagnostics hébergés, le rapprochement du trafic et la reproduction externe restent `NOT_RUN`.

Les quatre observations sont traitées ensemble : formulation FR/EN directement rattachée à la source, contrôles des identifiants et de la comptabilité, règle commune de jugement des réponses vides ou tronquées, procédure de date cohérente. Le [pilote](model-comparison.md), version `four-condition-pilot-3`, reste préparé, sans expérience ni résultat de modèle. Une réponse terminée vide reçoit `UNSCORABLE` sur les dimensions applicables et une utilité `UNDETERMINED`. Pour une réponse tronquée non vide, les violations visibles et omissions exigées échouent ; un fragment ininterprétable n’efface pas ces échecs.

Avant le commit et l’étiquette de release, fixer la date effective UTC, adapter et revoir sa garde, actualiser le condensat CFF, régénérer puis valider et auditer. Si la publication est reportée, réexaminer la date avant toute étiquette. Les anciennes étiquettes, sources, schémas, racines, observations, licences et visuels réservés sont préservés. La release du paquet ne constitue ni un déploiement ni une preuve sur le service hébergé.

Pour l’audit indépendant, utiliser les commandes et fichiers ci-dessus sur l’identité exacte publiée. Séparer `VERIFIED`, `REFUTED` et `NOT_VERIFIABLE`, sans contacter les services, sites ou surfaces de recherche de Gautier. Les preuves privées indisponibles restent une limite explicite. Aucun résultat antérieur n’est réattribué à cette nouvelle révision.
