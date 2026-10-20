---
document_type: brief
brief_id: GCR-CORRECTIVE-CONSUMER-20261020
repository: GautierDorval/governed-context-runtime
scope: B00-B10-and-GCR-C00-C06-offline-reference
producer: Codex
role: executor
auditor: Claude
business_owner: Gautier Dorval
status: approved-for-execution
claimed_stage: intended
created_on: 2026-10-20
verified_head: f1d8db4ab4c086e7c512aa7ccb63715a2cd62dfa
verified_origin_main: 39778036460b3a24a9897a46ee29ca15513c2fe2
supersedes: []
related_documents:
  - handoff-2026-10-19.md
  - verification.md
lifecycle_protocol: pagup-internal-docs/workflows/brief-handoff-lifecycle-protocol.md
eac_protocol_version: "2.2"
model_experiments: NOT_RUN
external_reproduction: NOT_RUN
visual_applicability: not-applicable
visual_reason: raw-operational-brief-only-product-guides-require-render-review
---

# Corrective reference and consumer reproduction mandate

The owner resumed the public reference mandate on 20 October 2026 with the
19 October consolidated corrective brief and the 20 October consumer reproduction
brief. Codex implements all local lots, then Claude audits one final candidate.
This document records intent and reconciliation before implementation, not completion.
Original briefs remain outside the public package. The 19 October original has
SHA-256 `cef3d4b6790c7fe1c1d8a930a4b9636feb2ab6b1937dee5766e5e0bca208d4ae`.

## Verified starting state and procedures

Target: public `GautierDorval/governed-context-runtime`, remote
`https://github.com/GautierDorval/governed-context-runtime.git`. GitHub main is
`39778036460b3a24a9897a46ee29ca15513c2fe2`; draft PR #6 is
`f1d8db4ab4c086e7c512aa7ccb63715a2cd62dfa`, with two successful exact-head checks.
Reuse its clean attached worktree and branch `docs/claude-handoff-20261019` under
lease. The permanent reference checkout stays on main with its private configuration
preserved. Historical worktrees and Dependabot PR #1 remain outside this mandate.

Read at locally available Pagup revision `88a70865fbebc7525153b66f47a77c3623bd4c0e`:
AGENTS.md; tooling/README.md and doctor.ps1; workflows/tooling-readiness-p0-protocol.md,
codex-claude-operating-protocol.md, repository-workspace-lifecycle-protocol.md,
brief-handoff-lifecycle-protocol.md, repo-update-p0-protocol.md,
behavioral-validation-protocol.md; doctrines/doctrine-026-eac-proof-chain.md.
The incoming brief cites a different Pagup revision, `459a23b51f9729bef6b57c9bad3409d18804552f`;
it is not silently substituted for the revision actually read.
Read the public handoff and private appendix, both original briefs in full,
MAINTAINING.md, CONTRIBUTING.md, SECURITY.md, package policy and workflow, and
verification documentation. Feature code and tests are read before their edits.
The doctor reports Node development ready; unrelated Google/MCP-launcher/Docker
checks fail. No live smoke was requested. Monthly tool review is not due until
22 October. Qualification uses the existing Node 24.17.0 binary, not global 26.7.0.

## One reconciliation matrix

All rows are owned by Codex; Claude reviews the completed package once. Statuses
below are the starting disposition. The final report records closure evidence.

| Lots | Current target and coverage | Starting disposition | Required closure |
|---|---|---|---|
| B00 / C00 | Main and documentary PR verified; existing copy and identity protections present | DEJA_COUVERT for initial identity; matrix prepared | Preserve WIP, pin intent, inventory and invariants |
| B01 / C03 | Archive raw digest and address checked, canonical envelope equality absent | MANQUE_CONFIRME by local Annex A probe | Noncanonical readdressed envelopes refused; original root still refuses before reads |
| B02 / C03 | Seven-field v0 preimage; report trusts archived field declaration | MANQUE_CONFIRME by local Annex A probe | Single immutable definition, contradictory declarations refused, unchanged v0 digests |
| B03 | JSON-only guide and no finite JSON/SSE reader | A_REPRODUIRE | One injected bounded reader, offline transport cases, paired guides |
| B04 | Historical demonstration exists; complete semantic example absent | MANQUE_CONFIRME | Distinct fictional bilingual example, four schemas plus full snapshot, semantic glossary |
| B05 / C01-C03 | Unit inspection and signed demo exist; selected whole-pack handoff absent | MANQUE_CONFIRME | One private-byte pack consumer, explicit policy and exact identity, negative handoff witnesses |
| B06 | Three dated observations exist without companion contracts | MANQUE_CONFIRME | Separate schema catalogue and bounded arithmetic/calendar checks, historical bytes intact |
| B07 | Production adapter and complete historical request evidence not part of public reference | BLOQUE_PAR_PREUVE for hosted diagnosis | Prepared request/capture dossier, hosted tests NOT_RUN |
| B08 | Existing bounded claims and dated producer evidence | A_REPRODUIRE | Precise identities, dated policy digest, synthetic provenance, commit citation and next-edition notes |
| B09 | No model experiment authorized | NON_APPLICABLE for execution | Equal-information fictional representations and protocol NOT_RUN |
| C01 | Policy clone, receipt capture, unit membership and private archive copies already implemented | DEJA_COUVERT, inspect tests before adding | Preserve layers and error precedence; add only demonstrated missing cases |
| C02-C04 | Existing fixed synthetic bundle and test receipt | MANQUE_CONFIRME for shareable kit | Manifest, explicit policy, single CLI, case matrix, third-party report template; exterior NOT_RUN |
| C05 | New pack integration path planned | A_REPRODUIRE | Same-byte offline measurements with real monotonic clock and distinct stages |
| B10 / C06 | Explicit package inventory, licences, regeneration, tests and read-only CI | DEJA_COUVERT infrastructure | Integrate files, run all gates and independent final audit, exact remote proof |

No OAuth, secret vault, gateway destination binding or outgoing authorization
mechanism exists in this public reference. Those Gateway-specific mechanisms are
NON_APPLICABLE; no new mechanism is created merely to reproduce their scenarios.
Policy mutation and byte substitution are checked at the existing local boundaries.

## Acceptance, sharing and stop conditions

Preserve the four historical Runtime schemas, recipes, original synthetic bundle,
observations, public projection and v0 preimages. No new runtime dependencies.
One complete pack consumer serves both the semantic example and reproduction kit.
Use reserved fictional identities, no real model answers, no production key.
Negative cases must prevent useful content reaching the fictional consumer.

Authorized: local implementation, validation, commits, branch push and draft PR
under the Pagup sharing convention. The only workflow is verification with
contents: read; it has no deployment or private export. No owner service, HTTP/HEAD,
MCP endpoint, experimental surface or model experiment may be called. GitHub,
official specifications and necessary dependency metadata may be read. No merge,
canonical branch push, tag, release, deployment, secret/visibility change, private
implementation mutation or contact with an external reproducer is authorized.
Claude's requested code audit is separate from a model-fidelity experiment.

Stop the affected operation on a lease conflict, unexpected base change, missing
required evidence, or scope expansion. Complete independent synthetic work.
The final package must distinguish local tests, exact-head CI, independent code
audit, integration and production. External reproduction and model experiments
remain NOT_RUN. Keep the worktree for owner review until a separately authorized
integration and reconciliation; do not clean another session's historical spaces.
