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

Synchronize both source status paragraphs with the three entry README files. Refresh the reviewed CFF digest in `package-policy.json.declarationDigests`, preserving the intentional absence of a CFF licence list: file-specific rights remain in `NOTICE.md` and the registries. Leave `date-released` absent for an unapproved future candidate. For the owner-authorized `0.2.1-proposed` release, CFF and its independent checker require the single plain line `date-released: 2026-10-21`. This release transition is reviewed with the edition, not inferred by regeneration. The checker validates this repository's CFF version profile, not all YAML/CFF documents.

The release gate rejects missing, duplicate, reformatted or changed dates even after declaration-digest regeneration. Before publishing an authorized release, set the effective publication date and review its edition-specific gate, refresh the CFF declaration digest, regenerate registries, validate and audit the final candidate, then create its commit and immutable tag. Record that commit outside itself. If publication is deferred to another UTC date, update and revalidate the candidate before tagging; never backdate publication. Never move an existing tag, including `v0.2.0-proposed`, or alter tagged bytes to fill in metadata later. The date and tests prepare the release; only the GitHub release and remote tag establish publication.

When a reproduction-kit input changes (including a link in a covered guide), first run `node spec/examples/reproduction/build-manifest.mjs`, then `npm run regenerate` and `npm run regenerate:check`. The kit's historical `referenceBaseCommit` is not the final executed commit; record the latter separately. Do not regenerate the semantic bundle for scenario typography or pilot assets stored alongside it.

## Optional MCP Apps companion and synchronized explanations

The isolated [companion](docs/en/mcp-apps.md) is built outside this checkout; never install its dependencies under `spec/examples/mcp-apps`. The root package's dependency ban and deterministic checks remain intact. Review the companion's exact lockfile, pinned reference-source digests and third-party notices independently. It does not alter the historical reproduction kit, fixture, pilot plan or reference edition.

Every user-visible Runtime capability, interface, trust boundary or qualification-status change must include corresponding updates on three surfaces together: this public reference, the French/English Runtime, agentic-web and Runtime-versus-MCP pages on gautierdorval.com, and the French/English governed-agentic-websites service pages on pagup.com. Record the concrete change and evidence here, explain mechanisms and limits on the personal site, and explain the user need and real availability on PAGUP. Preserve historical generated blocks and their source pins; current explanations belong in separately maintained sections.

A single dated qualification record links the implementation, actual client result and limits. Keep local tests, simulated hosts, real client observations, comparative experiments and business validation distinct. Publish dependency links before dependent pages. Review outgoing workflow effects, then record per-surface source revision, PR/merge and actual publication proof. A source change or PR alone is not a synchronized public release. No requirement here authorizes deployment or calls to protected research laboratories.

The separate `mcp-apps` CI job materializes its artifact under the runner temporary directory, installs only that isolated lockfile, builds the UI and exercises the real stdio entrypoint. It neither calls a model nor deploys a service. Browser and real-client observations remain separately scoped.

The requirement applies to each coherent delivered lot, not every intermediate commit. The public reference and both sites must contain actual corresponding explanations, with equivalent French and English capabilities, limits and availability states. A reread, internal operations note or date-only edit cannot replace a surface update. Updates may be brief and proportionate. Declare public synchronization only after checking the published reference and actually served pages. This current rule does not rewrite historical decisions.

## Discovery and declaration contract mirrors

The versioned files under `spec/declaration/` mirror the producer’s closed declaration contracts. They are distinct from the four historical Runtime schemas and do not change `SCHEMA_EDITION`. Preserve the 0.3.0 contract bytes. A contract change requires an explicit version and compatibility review; declaration 0.4.0 is a prepared transition until separately published.

For a discovery update, first review the compatible schema edition and these guides, validate the public package, then publish the exact reference commit through the authorized branch workflow. The producer records that immutable commit once in its maintained pointer source and regenerates the declaration, affected pack versions, digests, snapshot and embedded assets offline. Schema and documentation commits remain separate. No self-referential commit pin or runtime resolution of main/latest is permitted. Verify every new raw locator against the retained bytes before publishing the dependent declaration. Public-reference publication does not publish the producer’s declaration or activate a Worker version.
