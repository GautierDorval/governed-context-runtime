# Reference prerelease 0.3.1-proposed

This patch edition distributes the pilot-integrity work integrated by [PR 22](https://github.com/GautierDorval/governed-context-runtime/pull/22) at `24d04c5b0e7ede574ca148f9494aedfa58332578`, together with its reviewed edition metadata. The planned UTC publication date is **2026-11-06**. The remote tag and GitHub prerelease establish actual publication. Cite `v0.3.1-proposed` and the exact executed commit.

## Included changes

The pilot tests now inspect the final message bytes, reject invalid UTF-8 and forbidden pedagogical metadata, preserve literal JSON, and check isolation of the returned message arrays and shared backing buffers. A final assertion makes attempted calls through the intercepted network APIs fail the test run even when the caller catches the interception error. Mocks are restored after the tests.

The [integrity record](../records/pilot-integrity-2026-11-05.md) and [machine-readable evidence](../evidence/pilot-integrity-2026-11-05.json) state the qualification scope and limits. The network guard covers the APIs explicitly intercepted by the test suite. It does not prove isolation from DNS, direct UDP, native code, child processes or asynchronous work after the final assertion.

This edition adds no campaign sender. The four-condition pilot remains **NOT_RUN**, with 560 planned responses per configuration, no observations and no measured scores. Synthetic tests and the independent code review do not establish model fidelity or scientific results.

## Compatibility and publication

There is no change to the runtime verifier, historical schemas, fixtures, attestation recipes, reproduction-kit bytes or pack formats. The hosted Runtime's software version and corpus identity remain separate from this reference edition. Updating its pinned documentation, publishing the Web comparator and publishing this archive require their own deployment receipts; this document does not establish those actions.

The preceding [0.3.0-proposed notes](release-0.3.0-proposed.md), tags and downloadable archives retain their historical identities. Contracts remain proposed and demo signatures remain test-only.

Use Node 24.17.0 for parity with CI. Run `npm test` and `npm run test:dev`; materialize and qualify the optional companion separately as described in [MAINTAINING.md](../MAINTAINING.md). The release receipt records the final commit, archive digest, CI and publication evidence.

## Résumé français

Cette préversion corrective distribue les contrôles d’intégrité du pilote intégrés par la PR 22. Les tests examinent les octets des messages finaux, les métadonnées interdites, le JSON littéral, l’isolation des tableaux et des tampons partagés, ainsi que les tentatives de réseau couvertes par les interceptions déclarées. Le dossier d’intégrité précise les limites de ces preuves locales.

Le pilote scientifique reste **NOT_RUN**. Aucun expéditeur de campagne, résultat de modèle ou score mesuré n’est ajouté. Les schémas historiques, les exemples, les recettes d’attestation et le vérificateur conservent leurs octets. La référence, le comparateur Web et le service hébergé gardent des identités et des preuves de publication distinctes.
