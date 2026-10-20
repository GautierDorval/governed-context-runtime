---
document_type: brief
brief_id: GCR-ARCHIVE-P3-20261020
repository: GautierDorval/governed-context-runtime
scope: strict-archive-envelope-acceptance
producer: Codex
role: executor
auditor: Claude
business_owner: Gautier Dorval
status: approved-for-execution
claimed_stage: intended
created_on: 2026-10-20
verified_head: f20d155b204c9ceae2e0981d632da1f8db21847f
verified_origin_main: f20d155b204c9ceae2e0981d632da1f8db21847f
supersedes: []
related_documents:
  - verification.md
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
