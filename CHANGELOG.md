# Changes

## Unreleased: 0.2.1-proposed candidate

Prepared edition metadata and citation, real retained-corpus qualification, local MCP binding, bilingual reader guides and historical record relocation. The four-condition semantic pilot remains NOT_RUN, with canonical prose, an empty-document control and separate justification/utility judgments. See [candidate notes](docs/release-0.2.1-proposed.md). No tag, release, merge or new hosted observation is claimed here.

## P3 strict archive acceptance, 2026-10-20

The shared verifier now requires exactly the eight established source-archive
members and canonical standard base64, including zero unused padding bits. It
refuses extra or missing members with `archive_fields`, and a decodable spelling
that does not round-trip with `noncanonical_base64`. Existing raw digest/address
and canonical JSON checks still run first. Unit and pack consumers inherit these
checks; there is no legacy fallback or silent byte normalization.

This intentionally narrows accepted inputs. Envelopes previously accepted with
custom fields or noncanonical base64 require a conforming rebuild and separately
admitted identity; no such migration is performed here. Existing fixtures, schema
identifiers, roots, signatures and historical v0 preimages are preserved. The
reference remains an unreleased proposed edition, without a new tag or production
claim. See [verification and compatibility](docs/verification.md#strict-archive-acceptance-after-the-p3-compatibility-review)
and the [P3 mandate](records/archive-profile-p3-2026-10-20.md).

## Prepared next edition, 2026-10-20

- Reject noncanonical source archive envelopes even under a newly admitted root.
- Derive v0 record coverage from the actual immutable preimage definition and reject
  contradictory recipe declarations. Missing optional metadata no longer underreports
  the seven hashed fields; historical preimages and artifacts are unchanged.
- Add finite offline JSON/SSE reading, exact whole-pack consumption, a separate bilingual
  fictional semantic example and a self-identifying consumer reproduction kit.
- Describe historical observation variants with a separate local catalogue, preserve
  their bytes and prepare hosted diagnostics without probing the service.
- Prepare equal-information comparison and external reproduction protocols. Model
  experiments and exterior reproduction remain NOT_RUN.

No release, tag move, production deployment or new production signing profile is part
of this candidate. `v0.2.0-proposed` remains attached to its historical state. Cite a
precise repository commit URL (`/tree/<full-commit>`) and the kit digest for a run;
the final commit is recorded in the delivery receipt, outside its own source. No DOI
or new publication date is asserted. The reference edition, pinned schema edition,
hosted interface version, cryptographic corpus root and pack version are different
identities. A file at a website root is not a cryptographic corpus root.

Digest agreement cannot distinguish precompiled bytes from identical deterministic
reconstruction on request. That architecture claim and the measured byte property
remain distinct. A replayable capture, an [RFC 3161 time commitment](https://www.rfc-editor.org/rfc/rfc3161.html) and [workflow artifact
provenance](https://docs.github.com/en/actions/concepts/security/artifact-attestations) answer different questions; none makes a producer-controlled execution
organizationally independent. No timestamp service or attestation infrastructure is
introduced here. Future work requires separate scope: generic instance profiles,
published second-language consumer, additional MCP clients, Node 22 qualification,
stable rule identity separate from dated policy evaluation, production trust lifecycle,
external time/provenance, multidomain deployment, model evaluation and standards work.


Final-review corrections for the prepared edition: nominal reproduction commands
now select the historical `fictional-1` pack version and are executed from both
guides by the CLI tests. The pack wrapper captures its receipt before asynchronous
policy checks. Invocation-error behavior and exact nominal case/language binding
are explicit. The dated client table labels the replaced October 14 MCP snippet.
At that review, closing legacy archive members and canonical base64 padding was
deferred as a separate compatibility change. The P3 entry below records the later
authorized tightening; B01's JSON-byte guarantee alone does not establish it.


## Production observation, 2026-10-19

Added the dated producer record after the coordinated Runtime, MCP and root-file deployment: 564 root responses, six MCP exchanges with five direct comparisons, and a separate GET/HEAD smoke over 156 indexed Runtime resources. Updated the entry links and paired instance guides to the observed corpus root, preserving the October 12 and 14 records and the distinct historical pack root. The reference edition remains 0.2.0-proposed; no contract, verifier, fictional fixture, production signing claim or model result changes.

## Verification error-order regression tests, 2026-10-18

Added four tests for current and historical verification: an invalid signature or mismatched root remains the reported error when the verification time is also invalid. Each case preserves a valid verification and checks the individual fault before combining it with an invalid time. This locks the existing documented error order without changing the verifier or its error names.

## Verification boundary regression tests, 2026-10-18

Added permanent regression tests for retired and revoked keys with both allowed and disallowed key identifiers, technical-error precedence, current-only consumer use, and the direct verifier's current/historical behavior. The verification guide now states the required policy fields, numeric constraints and verification-time requirements in both modes. The existing reference behavior, error names, contracts, examples and evidence remain unchanged.

## Verification guide clarification, 2026-10-17

The verification guide names the historical-inspection entry point (`verifyTestReceipt` in `historical` mode), states that `decideConsumption` evaluates current use only, and explains why a revoked key is reported as `KEY_NOT_ACTIVE` by the consumer, once technical verification has succeeded, and as `key_revoked` by the signature layer. No code, contract, example or evidence change.

## Service and reference positioning, 2026-10-14

Clarified the hosted HTTP service and separate MCP adapter, the contents of this reference repository, and applications that remain to be evaluated. Reorganized the three entry paths, paired English/French guides and the distinction between synthetic evidence and dated producer observations. No new Runtime capability, contract, production signing service or model-fidelity result.

## Evidence and provenance clarification, 2026-10-14

Bound the retained follow-up records to a SHA-256 manifest and added a direct read of the exact declaration archived in the current snapshot (17 operations). Both guides explicitly identify the production implementation as private and distinguish version creation from traffic activation. Package verification now enforces the declared Node.js minimum; boundary tests cover rejected and accepted versions. This reference-package update does not activate or attest a new production deployment.

## Deployment observation and recovery safety, 2026-10-14

Added a dated producer statement of the hosted instance post-deployment checks, linked from both integration guides. The October 12 observation and synthetic examples are preserved. Recovery now requires an ownership marker and a closed directory layout before restoring or removing state; unrecognized and linked paths are preserved for manual inspection. No Runtime contract, corpus, reference version or production Worker code changes.

## Maintenance edition, 2026-10-14

Public maintenance: `package-policy.json` and `scripts/regenerate.mjs` recompute `rights.json` and `package-manifest.json` after a reviewed edit, and `npm test` stays read-only and dependency-free. Added tests for the historical text profile, indexed selectors, graph construction and controlled verifier mutations. The four JSON Schemas are executed with a closed local catalogue, and SVG assets are checked against a closed profile. Scripts and tests are formatted and type-checked with locked development dependencies (`npm ci --ignore-scripts`, then `npm run test:dev`). Actions are pinned to checkout v7.0.1 and setup-node v7.1.0, and Dependabot also watches npm. Documentation: French diagrams, French typography, the README benefits sentence, a tested-client matrix and a table of versions and identifiers. Reference edition 0.2.0-proposed: existing contract, verifier, example and evidence bytes are unchanged.

## Repository edition, 2026-10-13

Licences clarified: Apache-2.0 for code and configuration, CC BY 4.0 for documentation, diagrams and evidence, identity visuals reserved. Added a code of conduct, issue forms, a pull request template, Dependabot for GitHub Actions, README status badges and citation metadata. No contract, verifier or example behaviour changed.

## Operational documentation supplement, 2026-10-12

Bilingual hosted-instance guide, explicit REST/MCP examples, a dated producer observation, and an Apache-2.0 consumer example with counter-tests for verifying a v0 unit against a complete snapshot (`spec/examples/verified-unit.mjs`). Reference edition 0.2.0-proposed and all existing contract, verification and fictional fixture bytes are unchanged. No model experiment or general client compatibility is claimed.

## 0.2.0-proposed

Complete fictional receipt-to-snapshot demonstration; stricter metadata and unit-reference verification; bounded historical source parsing; JOSE media-type comparison without rewriting signed bytes; clarified v0 integrity scope; paired guides and editable visual assets. Proposed contracts retain their historical byte recipes. No generic-domain support, automatic updater, live-service qualification or model-fidelity result is claimed.

## 0.1.0

Initial documentation and offline reference publication.
