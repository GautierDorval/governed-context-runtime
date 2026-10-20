---
document_type: report
brief_id: GCR-QUALIFICATION-EDITION-20261020
repository: GautierDorval/governed-context-runtime
producer: Codex
role: executor
business_owner: Gautier Dorval
status: locally-qualified
created_on: 2026-10-20
reference_base: 441598c279832b5521c952de920966a486d79026
branch: corrective/qualification-edition-20261020
candidate_edition: 0.2.1-proposed
independent_review: recorded-separately-for-final-commit
hosted_diagnostics: NOT_RUN
external_reproduction: NOT_RUN
model_experiments: NOT_RUN
visual_applicability: local-public-documentation-preview
---

# Qualification and candidate delivery, October 20

The public corrections and four-condition pilot preparation are complete locally. The current verifier accepts all 11 retained real snapshots and 132 exact pack selections. A local run of the real adapter passes discovery and all 12 current selections, with explicit canonical-content binding. This does not qualify the currently hosted service. Lifecycle captures, origin-ledger reconciliation, model experiments and external reproduction remain unavailable or unexecuted as specified below.

## Identity, instructions and attribution

The base is `441598c279832b5521c952de920966a486d79026`, on the branch named in the metadata. The final containing commit and tree must be recorded outside this commit, in the delivery receipt and review/PR identity. Edition `0.2.1-proposed` is a candidate, not a tag or release.

Codex produced the code, translations, editorial comparison and local checks with AI assistance. This is not a claim of human code review. Any Claude review identifies the exact reviewed revision in a separate receipt. Historical reviews are not reused as approval of this candidate; private corpus results remain producer observations for a public-only reviewer.

Startup followed the user-supplied repository instructions and Pagup governance revision `88a70865fbebc7525153b66f47a77c3623bd4c0e`: AGENTS, tooling readiness and tooling README/doctor, repository/workspace lifecycle, brief/handoff lifecycle, behavioral validation, Codex/Claude operating and visual regression protocols. The private startup record lists the actual reads and their scope. Target root and remote were resolved before mutation, and an isolated leased worktree preserved the reference checkout and other sessions.

Windows qualification used Node **24.17.0**, npm **11.19.0** and the already installed locked development dependencies. Doctor returned a global failure because unrelated capabilities were not ready; that result was retained, not converted into a general readiness pass. The relevant local Node, Git, public GitHub readback and browser paths were exercised directly. No private producer test/build, deployment, service probe or model experiment was run. All new working proofs are outside the public checkout and `.git`.

## Acceptance matrix

| Objective | Result | Evidence and scope |
|---|---|---|
| Real retained corpus integrity | PASS local | [Qualification record](../evidence/qualification-2026-10-20.json): original envelopes, 11 roots, 59 archive reads per root, separately supplied pins. Shared files are not counted as distinct archives. |
| Exact real selection | PASS local | All 12 inventory entries for each root, 132 selections; current root also uses a separate same-producer intent registry. No external trust or missing-variant completeness claim. |
| MCP implementation path | PASS local | 13 in-memory exchanges through the actual retained adapter with a closed local-file resolver; zero network calls. Synthetic SSE controls remain separate. |
| Selected pack membership | PASS canonical profile | Original served bytes must already be canonical and match the selected `payloadDigest`. `fileBytesBound=false` is explicit; no representation fallback or file-byte equality claim. |
| Lifecycle | PASS local / hosted NOT_RUN | Seven pure comparison controls on actual retained shapes; one current entry, 11 roots. Successive timed hosted captures and a stable deployment window are missing. |
| Six declared audit fetches | NOT_RUN, unreconciled | No usable event-level origin log found in the bounded authorized local search. No invented counts, global exclusion, source telemetry mutation or metric subtraction. |
| Edition and citation | PASS preparation | Package, both lockfile locations, source, manifest and CFF agree. CFF has no global licence or anticipated release date. Four regression controls reject mixed editions after regeneration. |
| Reader documentation | PASS local | Paired qualification, diagnostics, observation and pilot guides; four historical records moved with authorship preserved. Local Markdown links and anchors checked. |
| Pilot | PASS preparation / NOT_RUN experiment | Four conditions, seven cases, two languages, ten repetitions, 560 responses per future configuration. Two reviewers, bounded retries, explicit applicability, raw agreement and nominal kappa; no overall score. |
| Historical identities | PASS | 35 protected files compared by SHA-256; schema, recipe, vector, bundle, root, observation, licence and visual identities unchanged. The verifier and existing consumer/MCP modules remain byte-identical to the base. |
| Public package | PASS local | Inventory, per-file rights and manifests regenerated in dependency order; package, formatting, type and test checks pass. |

## Commands and results

All commands run from the candidate root with Node 24.17.0. No command below invokes a model or an owner service.

```powershell
node spec/examples/reproduction/build-manifest.mjs
npm run regenerate
npm test
npm run test:dev
npm run demo:semantics -- fr
npm run demo:semantics -- en
npm run reproduce -- --policy spec/examples/reproduction/policy.json --suite
```

All final commands exit 0. The main suite has **433 tests: 432 pass, 0 fail, 1 Windows symlink skip**, plus **27 detected mutants** and the fictional demonstration/projection checks. Development has **34 pass, 0 fail, 0 skip**. The two semantic demonstrations return `VERIFIED_FICTIONAL_SEMANTIC_CONTEXT`. The reproduction suite returns `PRODUCER_REPRODUCED` with 16 case verdicts `PASS`; its refusals never deliver content. The Windows skip is retained as a platform limit, not a pass; a Linux CI result must identify its own commit and counts.

The new pilot tests check exact input identities and all coverage pointers, 129 classified pack leaves per language, 560 unique trial identities, 35 appearances per condition at each global position, honest unknowns and condition-specific judging applicability. They cannot prove semantic equivalence of prose; Codex separately read both prose versions against the fictional source. `prose-coverage.json` records the independent review as pending at preparation time; the final review receipt belongs to the immutable containing commit, not to a fabricated experiment result.

Initial harness mistakes (a demonstration flag and a missing preview index) were corrected and their failed logs retained. The initial adapter binding also identified a real representation distinction: the producer serves canonical JSON while the manifest's file digest names the original repository file. The final explicit canonical profile was tested positively and negatively; the producer, fixtures and verifier were not changed to hide that distinction.

## Visual scope

The public reader documents were rendered locally with PowerShell Markdown conversion, without remote assets or owner-site requests. Thirteen representative entry/section previews were captured at **390 × 844** and **1365 × 900**. All 26 PNGs were decoded and dimension-checked; mobile and desktop layouts were inspected. Tables/code stay within scrollable containers. This is a local preview smoke, not a verification of GitHub's production renderer or every off-screen section. The private visual report retains paths, viewport measurements and screenshots.

## Changes and preserved history

The four moved records are indexed in [records/README.md](README.md); links and limited French punctuation were corrected without replacing their historical conclusions. The semantic `scenarios.json` changes only four French punctuation spaces. The new prose, coverage, rubric and plan remain outside the unchanged historical semantic bundle. No runtime dependency or provider integration was added. `scripts/regenerate.mjs` is unchanged; the edition transition is explicit before regeneration.

The old `v0.2.0-proposed` tag continues to name `ed69a02a83bd0eae53e0755f01d5ea77c4529a65`. A remote readback at handoff must confirm this and the candidate's exact SHA/tree. No merge, new tag, release or deployment is represented by this local report.

## Remaining boundaries and next concrete inputs

- A hosted diagnostic requires separately authorized captures with exact bodies/headers, timing, adapter/deployment identity and a stable or explicitly transitional window. The [dossier](../docs/hosted-diagnostics.md) preserves four isolated MCP cases as NOT_RUN.
- Traffic reconciliation requires the origin event log and usable correlation identifiers for the declared October 19 window. The source declaration is retained without inventing six origin events.
- The pilot requires a separate execution decision, frozen model/provider/tokenizer configuration, measured input tokens, reviewer identities and roles, budgets and retention paths. These are null because no execution has occurred.
- External reproduction requires an exact published revision and an independent operator's retained run. Public synthetic reproduction already works without a provider, but it is not external validation.
- A release requires the owner's separate decision, final metadata/date checks, fresh identity/CI readback and a new unused tag. Candidate notes and citation instructions are ready; the historical tag must remain immutable.

[English qualification](../docs/en/qualification.md) · [Qualification française](../docs/fr/qualification.md) · [Candidate notes](../docs/release-0.2.1-proposed.md)
