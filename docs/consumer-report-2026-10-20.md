---
document_type: report
brief_id: GCR-CORRECTIVE-CONSUMER-20261020
repository: GautierDorval/governed-context-runtime
producer: Codex
role: executor
auditor: Claude
business_owner: Gautier Dorval
status: validated-locally
claimed_stage: locally-qualified
created_on: 2026-10-20
intent_commit: 97a13f4
reference_base: 39778036460b3a24a9897a46ee29ca15513c2fe2
initial_head: f1d8db4ab4c086e7c512aa7ccb63715a2cd62dfa
branch: docs/claude-handoff-20261019
independent_audit: initial-review-corrected-awaiting-final-review
external_reproduction: NOT_RUN
model_experiments: NOT_RUN
hosted_diagnostics: NOT_RUN
visual_applicability: local-markdown-preview
---

# Corrective consumer delivery report

This candidate implements the public, offline B00-B10 and GCR-C00-C06 mandate.
It closes two reproduced reference defects, supplies one complete-pack consumer,
and prepares a reproducible fictional exercise. It makes no new production claim.
The [intention and reconciliation](consumer-mandate-2026-10-20.md) precede code
changes. This report describes the corrected, locally qualified candidate after the first
independent audit of `b106562bb0d87187d21a5a0deb220731427a9260`. The exact containing commit, remote checks and audit verdict
are attached separately to draft PR #6; they cannot be self-embedded here.

Codex prepared and implemented the changes with AI assistance. Automated checks
and visual inspection by Codex are described below. No human review is claimed.
Claude performed that independent code audit; the final correction review is
attached separately to the exact candidate. No Git authorship is attributed to Claude.

## Scope and procedures

The target is only `GautierDorval/governed-context-runtime`. The existing attached
worktree was reused under a lease; main, private configuration, historical
worktrees and Dependabot PR #1 were preserved. No private implementation or owner
service was accessed. New fixtures are fictional; historical source locators are
opaque strings required by the preserved profile, never fetched.

The Pagup documents actually read are recorded in the intention. Its available
revision was `88a70865fbebc7525153b66f47a77c3623bd4c0e`. GitHub comparison with the
brief's `459a23b51f9729bef6b57c9bad3409d18804552f` showed four later commits affecting
only the unrelated advertising-pixel handoff and handoff index, not the applicable
procedures. The visual regression protocol and visual tooling instructions were
also read. No central instruction file was changed.

Qualification used Windows 11 build 26200, PowerShell 7 and Node.js 24.17.0, matching
the workflow's Node version. The doctor's unrelated Google, MCP-launcher and Docker
failures did not prevent these offline checks. Existing locked development modules
were available; no dependency or lockfile change was needed.

## Completion matrix

| Lot | Disposition | Implementation and evidence | Limit |
|---|---|---|---|
| B00 / C00 | Completed | Starting Git/remote state and intent pinned; all B/C rows reconciled in the mandate; historical byte comparison below | A historical handoff is not current service proof |
| B01 | Corrected | `spec/reference/verification.mjs`, `test-public-finish.mjs`: canonical raw archive equality after digest/address checks; private byte copy | A newly chosen root is a separate trust decision |
| B02 | Corrected | Immutable `V0_RECORD_FIELDS`, shared `unitDigestCoverage`, unit and pack inspectors; `test-verified-unit.mjs` | Full snapshot membership and legacy unit digest remain different scopes |
| B03 | Completed locally | `spec/examples/read-mcp-response.mjs`, `test/mcp-response.test.mjs`, paired instance guides; 20 tests exercise JSON/SSE, fragmentation, identity, errors, limits and actual guide code with injected fetch | No new hosted compatibility observation |
| B04 | Completed | `docs/{en,fr}/pack-semantics.md`, `spec/examples/semantic-boundaries/`, 11 behavioral and 11 schema tests | Conditions are declarations; factual satisfaction and model adherence are not established |
| B05 / C02-C03 | Completed | `spec/examples/verified-pack.mjs`, 23 tests; full verification, exact selection, private archive copies and useful result; shared by both examples | Inspection alone has no signature or permission; signed path evaluates both separately |
| B06 | Completed | `spec/evidence/`, `test/observation-schemas.test.mjs`, 14 cases; `docs/observations.md` | Summary consistency is not reproduction of the recorded exchanges |
| B07 | Dossier prepared; hosted NOT_RUN | `docs/hosted-diagnostics.md`: isolated headers/version/method cases, five lifecycle cases and missing capture list | No raw adapter implementation or full response captures available; no fake production comparator |
| B08 | Completed | `docs/verification.md`, `evidence/README.md`, paired guides, `CHANGELOG.md`: roots, policy identity, original/factory/new bundle lineage, commit citation, timestamp/attestation scope | No external timestamp or build attestation acquired |
| B09 | Protocol prepared; experiment NOT_RUN | `docs/model-comparison.md`, exhaustive comparison map and seven bilingual scenarios; 129 terminal values per language | No tokenizer, model answer, fidelity score or causal result |
| C01 | Existing protections preserved and missing witnesses added | `test-consumer.mjs`, `test-verified-pack.mjs`: policy capture during controlled wait, fresh revocation decision, decision replay refusal, exact identities, zero callback on refusals | No Gateway vault, OAuth or outbound destination mechanism in this reference |
| C02-C04 | Completed; external NOT_RUN | `spec/examples/reproduction/`: manifest, explicit policy, CLI, 15 cases plus v0 witness, report template; four CLI integration tests | Producer reproduction is not an outside run or independent cryptographic implementation |
| C05 | Measured locally | `benchmark.mjs` and `evidence/consumer-cost-2026-10-20.json`; same-byte before/after and separate stages | Sequential synthetic timings, no production or model latency claim |
| B10 / C06 | Locally qualified | Explicit inventory, licences, regenerated registries, full suites, preserved historical files and visual preview | Merge, release, deployment and outside reproduction are not authorized by this result |

## Reproduced defects and compatibility

Before correction, the Annex A probes accepted a noncanonical archive readdressed
under a newly computed inventory root, and a recipe declaring two extra hashed
fields under another newly computed root. The original root refused both before
any archive read. Neither probe established a signature bypass.

B01 now refuses pretty-printed, leading/trailing-whitespace and reversed-key
archive envelopes with `noncanonical_archive_envelope`, even when their byte
digest, URI, inventory root and snapshot ID have been coherently rebuilt. Raw
byte digest and address checks still precede parsing/canonical comparison.

B02 now refuses overclaimed, incomplete, empty, duplicate, null and non-string
coverage declarations with `invalid_recipe_coverage` before reporting coverage.
Permutation preserves the stable seven-field order. Missing optional metadata
in a recognized v0 recipe reports the seven actual fields; it no longer reports
an empty list. A selected-value profile reports zero directly covered record
fields. Unknown/missing recipes remain distinct refusals. Mutating a returned
coverage list cannot alter the algorithm or a subsequent report. The historical
v0 preimage has not acquired selectedValueType or forbiddenTransformations.

The combined red suite had 10 failures before the correction. The corresponding
B01/B02/vector suite then passed 140/140. Wrong original roots still fail before
archive retrieval. These controls use recomputed roots explicitly, avoiding an
earlier receipt-signature failure that would hide the defect being tested.

## Validation and immutable evidence

Commands actually run with exit 0:

```powershell
npm test
npm run test:dev
node scripts/check-package.mjs
npm run regenerate:check
git diff --check
```

`npm test`: 343 tests, 342 passed, 0 failed, 1 Windows symlink test skipped;
22/22 existing mutants detected. It runs the original signed demonstration
(338 snapshot checks), public projection verifier, both semantic language paths
(330 checks each), whole-pack tests and the 16-case producer reproduction suite.
`test:dev`: formatting, TypeScript and 34/34 schema/observation cases passed.
The strict schema catalogues do not fetch remote references.

Package identity checks were run after the suites and found the same file bytes
as the pre-test manifest. A first integrated run caught manifest drift while a
new example README was still being finalized; after the lot was frozen, explicit
regeneration and the complete suite passed. The failure was retained in the
private work log, not described as a code defect or omitted success.

All of the following compare byte-for-byte with main `3977803`:

- Four historical schemas: `spec/context-pack.schema.json`,
  `spec/context-pack-manifest.schema.json`, `spec/intent-registry.schema.json`,
  `spec/runtime-snapshot.schema.json`.
- `spec/attestation-recipes.json`, `spec/examples/synthetic/bundle.json`,
  `spec/reference/vectors.json`.
- `evidence/instance-2026-10-12.json`, `instance-2026-10-14.json`,
  `instance-2026-10-19.json`, and `evidence/publication.json`.

The original bundle's one v0 unit preimage and digest were compared by executing
the old and new implementations on identical bytes; both are identical. The
historical vectors also pass. The old root remains
`sha-256:5f100cbe2bd6358025500a1d88b6162441fd554ce1ca6c2fb5b9111aad197edb`.
The distinct unsigned semantic example has root
`sha-256:0b0bb14fdd5c29a04a7304c9d5b7fe901c8dd62fb145546e638ccc736efd944a`.
It has 12 archives, 14 units and 10 graph nodes; no historical fixture is replaced.

Eight representative guide/section views were captured at 390 x 844 and 1365 x 900
with the Pagup static visual harness. All 16 viewport/overflow guards passed;
eight mobile and two table/code desktop PNGs were inspected. Prose, links and
headings were readable without overlap. Wide code and tables use internal
horizontal scrolling. This is a local Markdown preview with a documented style,
not a claim that GitHub's current rendering or the hosted product UI was tested.
Private capture ID: `consumer-reproduction-20261020/visual-smoke`; source hashes
are recorded in `visual-sources.json`. The public package carries no workstation
paths, browser profile or private logs.

## Cost observation

[Public measurements](../evidence/consumer-cost-2026-10-20.json) retain all 40
samples after 5 warmups, rounded to integer microseconds for the package's JSON
profile. The raw timing record is identified by SHA-256 in that file. Median is
the upper middle ordered sample and p95 uses index 37 of 40; these conventions
match the measuring script. The same historical bundle was used on both sides. This measurement was rerun
after the audit correction that captures the receipt before asynchronous work;
the earlier timing record remains in the private evidence history.

| Stage | Median, ms | p95, ms |
|---|---:|---:|
| Old full receipt + snapshot | 4.042 | 5.233 |
| Current full receipt + snapshot | 4.916 | 6.109 |
| Current snapshot only | 4.412 | 5.395 |
| Current local decision only | 0.449 | 0.674 |
| Current selected pack with decision | 4.565 | 5.455 |

The comparable full path is about 0.874 ms slower at the median in this local
sequence. There was no earlier whole-pack consumer to compare. File loading is
separate; the tiny fictional callback is below meaningful timing resolution.
Separate stage measurements are not additive latency guarantees. No permission
cache was introduced; every operation re-evaluates the original receipt under
its current supplied policy.

## Consolidated corrections from the first audit

Claude returned `PASS_WITH_RESERVATIONS` on `b106562`, identifying one P2 and five
P3 observations. The P2 is corrected: both nominal guide commands now use
`fictional-1`, the historical pack version. Two tests execute the literal commands
from the guides and check successful FR/EN delivery. The earlier `0.1.0` command
was refused without content; it was a reproduction defect, not a signature bypass.

The receipt is now cloned at invocation, before asynchronous policy validation;
a regression mutates both original receipt strings immediately after the call.
The captured operation succeeds and the next call refuses the modified receipt.
Malformed invocation types and non-cloneable objects still reject the promise;
that API boundary is now explicit in the declaration and documentation and tested
with zero consumer calls. Domain refusals remain structured `REFUSED` results.

Both dated client tables explicitly name the historical October 14 MCP snippet,
which the current section has replaced. Nominal case IDs now require the matching
language; contradictions are refused as `case_language_mismatch`. The default
case follows an explicit FR/EN choice. The fixed negative `wrong-language` case
still exercises the complete verification path.

The observed legacy latitude for additional archive members and nonzero unused
base64 padding bits is retained and documented. It is outside B01's canonical
JSON byte guarantee, needs a new envelope/root admission, and was already present
before this lot. Closing it changes compatibility; it is deferred explicitly for
a separately reviewed profile, with no assertion that B01 closes those properties.

The first audit exercised 136 B01/B02 controls successfully and additional
consumer/MCP/document/kit probes. It reported its own erroneous assertions
separately from the guide defect. Those raw scripts and outputs are retained.
The corrected candidate is submitted once for final revision, with original
baseline files and timing bytes available for direct comparison.

## Use and next boundaries

From a clean checkout, the dependency-free commands are:

```powershell
npm run demo
npm run demo:semantics
npm run demo:semantics -- en
node spec/examples/reproduction/run.mjs --policy spec/examples/reproduction/policy.json --suite
npm test
```

Development schema checks require the existing locked dependencies; in a fresh
checkout use `npm ci --ignore-scripts`, then `npm run test:dev`. The paired
[French](fr/reproduction.md) and [English](en/reproduction.md) guides explain the
output and exact selection flags. Glossary: [FR](fr/pack-semantics.md),
[EN](en/pack-semantics.md). Prepared model protocol: [comparison](model-comparison.md).
Dated records: [observations](observations.md) and [evidence lineage](../evidence/README.md).

The final audit concerns a stable public candidate. It cannot establish current
hosted behavior, client compatibility in Claude Code/Codex/Cursor, factual truth,
model compliance, an outside reproduction or source-build provenance. Those
remain untested or separately bounded historical observations. Deferred profile
versions, deprecation, cross-language generation, governed-unit work and external
attestation are recorded in the changelog, not silently implemented.

No merge, canonical push, tag, release, deployment, owner-service probe, model
experiment or outside-reproducer contact was performed. Branch sharing and draft
PR review are the authorized next delivery steps. The worktree is retained for
that review and later separately authorized integration.
