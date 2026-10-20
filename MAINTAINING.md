# Maintaining the reference package

Every published file is listed in `package-policy.json`, receives exactly one licence from its rules, and is recorded with its digest in `rights.json` and `package-manifest.json`. `npm test` checks that state as it is and never repairs it.

## After a reviewed content edit

1. Edit the source file, for example a guide under `docs/`.
2. Run `npm run regenerate`. It recomputes only `rights.json` and `package-manifest.json`.
3. Review the diff, then run `npm test`.

`npm run regenerate:check` performs the same computation in memory and reports stale registries without writing anything. Regeneration records digests; it does not certify the author or the relevance of a change, which remain subject to review.

## Policy changes

These changes are refused by the generator until `package-policy.json` is edited in the same pull request, with an explanation:

- adding, removing or renaming a file (`inventory`);
- changing a licence class or rule (`licences`);
- changing `NOTICE.md`, `CITATION.cff` or a licence text (`declarationDigests`).

The checker pins, independently of the policy, the official licence texts, the SPDX expression, the reserved identity visuals and the rules for Markdown, code directories and other files. The list of individual code and configuration files comes from the policy and is reviewed with it.

## Development dependencies

`npm test` and `npm run demo` use Node.js only. `npm run test:dev` also needs the development dependencies locked in `package-lock.json`: install them with `npm ci --ignore-scripts`. They stay in `node_modules/`, outside the package, and nothing from them is needed at run time. `package.json` declares exact versions, and the checker refuses runtime dependencies, install lifecycle scripts and lockfile entries that are not development packages from the npm registry. Review the licences of the locked packages whenever the lockfile changes.

## Dependabot updates

Dependabot proposes weekly updates of the pinned Actions and of the development dependencies. Such a pull request changes `.github/workflows/verify.yml`, or `package.json` and `package-lock.json`, and therefore fails the `verify` check until its metadata is regenerated. This is intended: an update is never accepted without review.

1. Read the release notes of the proposed version. For an Action, check that the pin is a full commit SHA; for an npm package, check that the version stays exact and review the licences of new locked packages.
2. Check out the pull request branch, run `npm ci --ignore-scripts`, then `npm run regenerate`.
3. Commit the regenerated `rights.json` and `package-manifest.json` to the same branch and push.
4. Merge only after `verify` passes.

Dependabot cannot perform step 2 itself, and no workflow with write access does it automatically.

## Verifier path tests and mutations

`test/` exercises verifier paths that the synthetic example alone does not reach: the historical text profile `utf8-nfc-lf-trimmed-v0`, indexed selectors and graph construction. Expected bytes and graph nodes are written out by hand from the recipe; they are never computed by the function under test.

`scripts/test-mutations.mjs` applies controlled mutations to a temporary copy of `spec/reference/verification.mjs` and requires each one to make these tests fail on an assertion. `scripts/mutation-verdict.mjs` reads that outcome from the structured events of the `node:test` runner, not from printed output; a crash, a timeout or an inconsistent count is reported as a broken mutant, never as a detection. When a reviewed change to the verifier moves or rewrites a mutated line, the harness stops with "mutation target must occur exactly once": update the mutation list in the same pull request rather than deleting the case.

## Interrupted regeneration

`npm run regenerate` prepares both backups and replacement files in `.regenerate-staging/`, then publishes the complete recovery state as `.regenerate/` before replacing either registry. If interrupted, the generator refuses both working directories. Run `npm run regenerate:recover`, then `npm run regenerate` and `npm test`.

Recovery requires the generator ownership marker and a recognized file layout before changing or removing either working directory. Unmarked, malformed, linked or unexpected content is preserved and refused. Recovery discards recognized unpublished staging files without changing the registries, restores both backups from published state, or finishes cleanup while preserving a completed new pair. Missing backups or invalid JSON are refused before either registry is changed. If both working directories exist, recovery preserves them and refuses the ambiguous state. Do not run writers or recovery concurrently.

An older unmarked directory, an incomplete backup or an interruption before the ownership marker is complete cannot be recovered automatically. Interrupted cleanup that has already removed the marker is also preserved for manual inspection. If recovery fails, preserve both working directories and the current registries for diagnosis. Check whether the current pair is intact against a trusted Git revision. If necessary, restore **both** registries from that same revision, preserving other edits. Only after confirming a consistent pair, move the working directories outside the package, then run regeneration and the full tests. Regenerated digests do not prove that recovered metadata was trustworthy.

## Preparing a reference edition

Edition numbers differ from schema identifiers, fixture versions and service versions. For the current `0.2.1-proposed` candidate, update `package.json.version`, both root version fields in `package-lock.json`, `CITATION.cff.version`, `docs/source.json.documentVersion`, and explicitly `package-manifest.json.documentVersion`. Update the expected reference edition in `scripts/check-package.mjs`; preserve the manifest/documentation schema identifiers and `SCHEMA_EDITION`. Regeneration deliberately retains the previous manifest's edition and does not choose a new one. Review this metadata transition before regenerating file entries.

Synchronize both source status paragraphs with the three entry README files. Refresh the reviewed CFF digest in `package-policy.json.declarationDigests`, preserving the intentional absence of a CFF licence list: file-specific rights remain in `NOTICE.md` and the registries. Leave `date-released` absent while preparing the candidate. The checker validates this repository's CFF version profile, not all YAML/CFF documents.

The candidate gate rejects `date-released` even after declaration-digest regeneration. Before a separately authorized release, explicitly review and adapt that candidate-only gate, set the actual release date, regenerate registries, validate the resulting candidate, then create the release commit and new tag. Record that commit outside itself. Never move `v0.2.0-proposed` or amend its bytes to fill in metadata later. If publication is deferred, recheck the candidate date before tagging.

When a reproduction-kit input changes (including a link in a covered guide), first run `node spec/examples/reproduction/build-manifest.mjs`, then `npm run regenerate` and `npm run regenerate:check`. The kit's historical `referenceBaseCommit` is not the final executed commit; record the latter separately. Do not regenerate the semantic bundle for scenario typography or pilot assets stored alongside it.
