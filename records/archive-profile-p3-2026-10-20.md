---
document_type: brief
brief_id: GCR-ARCHIVE-P3-20261020
repository: GautierDorval/governed-context-runtime
scope: strict-archive-envelope-acceptance
producer: Codex
role: executor
auditor: Claude
business_owner: Gautier Dorval
status: locally-qualified
claimed_stage: locally-tested
created_on: 2026-10-20
verified_head: f20d155b204c9ceae2e0981d632da1f8db21847f
verified_origin_main: f20d155b204c9ceae2e0981d632da1f8db21847f
supersedes: []
related_documents:
  - ../docs/verification.md
  - consumer-report-2026-10-20.md
lifecycle_protocol: pagup-internal-docs/workflows/brief-handoff-lifecycle-protocol.md
eac_protocol_version: "2.2"
visual_applicability: not-applicable
visual_reason: operational-mandate-only-public-verification-guide-requires-separate-render-check
---

# P3 archive acceptance mandate

On 20 October 2026, the owner explicitly opened the P3 compatibility work after
PR #6 was merged. The live remote and reference checkout were both verified at
`f20d155b204c9ceae2e0981d632da1f8db21847f`, tree
`bc9f87107d80cdb7ef00b69f7108b29dbc980505`, with successful merge CI
`39471418709`. This document records intent before code changes.

## Scope and compatibility decision

Close two legacy acceptance gaps in the shared snapshot verifier: additional
source-archive members and nonzero unused base64 padding bits. Reject these
representations instead of silently rewriting bytes. The stricter acceptance
rules apply by default to verification and its existing unit/pack consumers;
there is no fallback that reopens the same gap.

This is a deliberate narrowing of accepted envelopes. It does not change the
portable canonical JSON algorithm, the archived source bytes, the historical v0
unit preimage, a wire schema identifier or the inventory root algorithm. Existing
canonical examples must remain valid byte for byte. Previously accepted extended
or noncanonical envelopes may need a producer rebuild, a new root and a separately
admitted receipt; no automatic migration or trust decision is added.

Probable surfaces: `spec/reference/verification.mjs`, dedicated archive tests,
controlled mutation tests, the package test list and inventory, verification
instructions and changelog. Preserve the four historical schemas, recipes,
original and semantic fixtures, vectors, observations and public projection.
No runtime dependency, provider, network sender or new acceptance-mode option.

## Validation and authority

Reproduce acceptance on the unchanged baseline, then demonstrate refusal under a
coherently recomputed and deliberately admitted root. Distinguish that from the
original pinned-root refusal. Cover exact field membership, missing/replaced
members, both padding forms, canonical binary/text bytes, error precedence and
zero useful delivery through the real signed consumer entry point. Keep positive
controls, historical byte comparisons, complete tests and discriminating mutants.

Finish all code and documentation before one consolidated Claude review. If that
review finds defects, correct them together and request one final revision.
The authorized scope includes local work, commits, branch sharing and a draft PR.
The earlier merge GO applied only to PR #6; this lot does not authorize a new
merge, tag, release, deployment, protected-service probe, model experiment or
external-reproducer contact. Private implementation and other repositories remain
read-only. Stop affected work on a lease conflict, changed base or source, failed
invariant, or a required change outside these limits.

## Workspace and procedures read

Reuse the existing clean attached workspace on the new branch
`fix/archive-profile-p3-20261020`, based on verified main. This isolates the public
package from the reference checkout's preserved private configuration and reuses
locked development dependencies. Historical branches and other worktrees remain
untouched. Use the existing pinned Node 24.17.0 binary.

Pagup revision actually available and read:
`88a70865fbebc7525153b66f47a77c3623bd4c0e`. Procedures used: AGENTS.md,
tooling-readiness, tooling README/doctor, Codex/Claude operating, repository
workspace lifecycle, brief/handoff lifecycle, behavioral validation and visual
regression. Read this repository's maintenance rules, verification implementation,
consumers, tests, package policy and verification-only workflow. The doctor and
private execution evidence are retained under the lot identifier
`archive-profile-p3-20261020`; no private path or configuration is published.


## Local execution result

The shared verifier enforces the exact eight-member envelope and a lossless
standard-base64 decode/re-encode check. No consumer fallback, schema identifier,
dependency or historical byte format changed. The reproduction kit manifest was
explicitly rebuilt to identify the updated verifier; it was not silently ignored.
The verification guide and changelog describe the intentional compatibility
restriction and the requirement for separately admitted replacement identities.

The 69 focused tests first produced 25 passes and 44 failures on the unchanged
implementation, then 69 passes with the correction. Those 44 failures include
new error-contract expectations; they are not 44 independent accepted attacks.
Positive controls include empty, textual and binary source bytes. Counterexamples
cover all 15 four-bit and 3 two-bit padding aliases, unknown/missing/substituted
members, non-object envelopes and the earlier integrity checks. Valid ephemeral
Ed25519 receipts and deliberately admitted new roots still produce snapshot-stage
refusals with zero consumer callbacks. The original pin rejects before archive
access. No production key or authority was used.

Initial local Node 24.17.0 validation on Windows, before the review corrections below:

- `npm test`: 412 tests, 411 passed, zero failed, one platform-dependent symbolic
  link test skipped; all 25 controlled mutants detected.
- `npm run test:dev`: formatting and type checks passed; 34 tests passed.
- 25 protected files are byte-identical to the admitted base, including all
  semantic example files; both snapshots verify, both roots are unchanged and all
  15 unit preimages are identical, including the original v0 preimage.
- Three local Markdown previews were captured and visually inspected at 390 x 844
  and 1365 x 900, without horizontal overflow or unreadable wrapping. This checks
  the changed guide/changelog content in a local renderer, not GitHub's live UI.

The first complete run correctly refused the outdated kit manifest in four CLI
tests. After explicit manifest regeneration, the complete run passed. Logs retain
both results. The development checks had already passed and their inputs did not
change during that manifest correction. Private evidence is retained under the
lot identifier above. The final independent audit, exact remote commit and CI
result are recorded separately on the associated draft PR; this local record
alone does not claim those later states or authorize integration.


## Consolidated independent-review corrections

Claude reviewed `2ce6644073a15b4dc6faf5bdc1c9a7e2a516b4a2` and returned
`PASS_WITH_RESERVATIONS`: P3 was closed for verifier behavior, with no P0, P1 or
P2 finding. Three remaining in-scope observations are corrected together:

- Extra and missing members are now tested on the last archive as well as the
  first. The signed consumer member-fault control also uses the last archive.
  A controlled mutant limits the member guard to the first item and is detected.
- A double fault combines noncanonical padding with a wrong decoded-source
  digest. It requires `noncanonical_base64`; a canonical spelling control reaches
  `source-bytes`. A second mutant reverses that documented order and is detected.
  This is a diagnostic-order guarantee, not an additional accepted-input defect.
- The earlier consumer report marks its deferred archive latitude as superseded
  and links the current P3 rules, preserving the history of the earlier review.

The verifier and runtime consumers are byte-identical to the reviewed candidate.
The 72 focused controls pass. The complete local run now has 415 tests: 414 pass,
zero failures, one Windows symbolic-link skip; all 27 controlled mutants are
reported detected. Formatting, type checks and 34 development tests pass again.
The corrected report paragraph was captured and inspected locally at 390 x 844
and 1365 x 900. The original protected fixtures, roots and preimages are unchanged.
These corrections form one final revision for independent review. The exact final
commit, its subsequent review result and CI belong to the PR evidence, not to this
self-referential document. The internal protocol-reference remark was outside the
active corrective scope and did not open a separate change.
