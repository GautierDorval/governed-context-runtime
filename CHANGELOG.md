# Changes

## Verification boundary regression tests, 2026-10-18

Added permanent regression tests for retired and revoked keys, technical-error precedence, current-only consumer use, and the direct verifier's current/historical behavior. The verification guide now states the required policy fields and their numeric constraints in both modes. The existing reference behavior, error names, contracts, examples and evidence remain unchanged.

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
