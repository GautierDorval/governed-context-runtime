# Evidence you can reproduce

This directory separates three kinds of material: the fictional offline verification exercise and synthetic metric projection; dated producer observations of the hosted HTTP/MCP service; and model-fidelity experiments, which remain `NOT_RUN`. Start with the [October 19 service observation](instance-2026-10-19.json) for the latest dated producer record in this edition. None of these categories substitutes for another.

Run `npm test` for reference checks, the complete fictional context exercise, and the existing synthetic public-evidence projection. Run `npm run demo` for the shortest path from receipt to verified snapshot.

The fictional examples and metric projection are synthetic. They measure no production activity, adoption or effect on model answers. Expected rejection cases are successful controls, not service incidents. The context fixture and evidence publication are distinct artifacts; their identifiers and roots must not be conflated.

The synthetic projection in `evidence/publication.json` preserves measured, measured-zero, partial, unavailable and non-applicable states. Missing values are not zero. Its digest supports integrity checks; it does not authenticate the source or prove completeness of a private source. Real-data export is not supported by this edition. Publication thresholds alone do not prevent inference across reports or overlapping periods.

The reference checks are producer validation. Documentation, a repository and a site rendering of the same evidence are one lineage, not independent confirmations. External model experiments: `NOT_RUN`. Production transport and current deployment are not established by these offline tests.

[Verification limits](../docs/verification.md) · [Synthetic publication](publication.json)

## Artifact provenance and scope

| Artifact | Role and identity | Evidence boundary |
|---|---|---|
| [evidence/publication.json](publication.json) | Preserved synthetic metric projection, publication ID `sha-256:e03c7c3249b4e7eba0b9115af3f7c68d71d7abab7b28e7256f24bfc25d8927bd`. | Its `01aef227…` root is documentary context. Reusing that identifier does not authenticate a link to measured activity or make the projection production telemetry. |
| [spec/public-evidence/fixture.mjs](../spec/public-evidence/fixture.mjs) | Factory for separate synthetic projection tests, including its own placeholder root and observations. | It is not the generator or a second independent confirmation of the preserved publication above. |
| [spec/examples/synthetic/bundle.json](../spec/examples/synthetic/bundle.json) | Original complete fictional snapshot/receipt exercise. | Its root, receipt and synthetic provenance remain distinct from the metric projection and hosted service. |
| [spec/examples/semantic-boundaries/bundle.json](../spec/examples/semantic-boundaries/bundle.json) | Separate fictional semantic example with its own context and receipt. | It illustrates conditions, limits and source relationships; it is neither a production corpus nor an external-model experiment. |
| [October 12](instance-2026-10-12.json), [October 14](instance-2026-10-14.json) and [October 19](instance-2026-10-19.json) | Dated producer observations with their original bytes, dates, counts and historical roots. | No raw response bodies are published, no current hosted check is performed by the offline suite, and no independent organization is authenticated by the summaries. |

These artifacts do not form several independent confirmations of one event. A byte digest establishes correspondence to committed bytes; a canonical digest does so under its declared representation profile. Matching bytes alone cannot distinguish reading a stored file from deterministic reconstruction of the same content by a server. A verified snapshot binds related artifacts under the admitted root; a test signature checks its cryptographic test profile; a local decision applies the supplied policy. None of those facts substitutes for a model evaluation, which remains `NOT_RUN` here.

The [observation contracts](../docs/observations.md) validate each historical shape and its bounded date/count relationships with a separate local schema catalogue. They preserve the producer's declared result and report recalculated internal consistency separately. The [hosted diagnostic dossier](../docs/hosted-diagnostics.md) records the unresolved lifecycle/`initialize` cases, their missing captures and `NOT_RUN` status without replacing historical results.

## Historical hosted instance observation, October 12, 2026

[October 12, 2026 technical observation](instance-2026-10-12.json) records eight read-only HTTP/JSON-RPC exchanges and their response digests. Its `closureReconciliation` block separately summarizes a later producer reconciliation: 20 attempted requests, of which one HEAD capture failed and was not repeated, and two complete unit records verified against the same root. The producer observed eight MCP tools and identical REST/MCP bytes for one French pack. Raw responses are retained by the producer; this public record is an observation statement, not an independently signed deployment attestation. The offline package tests do not repeat network requests or establish current availability.

The observation concerns a real endpoint but uses producer-initiated technical traffic. It is separate from the fictional context exercise and synthetic metric projection above. No adoption total or model-effect result is inferred. The [integration guide](../docs/en/instance.md) provides a bounded way to inspect the service again; a later response may belong to a different publication.

## Historical hosted instance observation, October 14, 2026

[Deployment observation](instance-2026-10-14.json) records the producer's post-deployment REST/MCP capture (354 requests) and root-file comparison (122 requests). The captured current root is `sha-256:d5d52ed75360d38cd1fa0e434c302d57a80ec94e9be9daaf3e8d7866fd2305e0`. A separate Python implementation verified the retained capture; it is still the producer's evidence lineage. This summary does not publish the raw responses, authenticate the deployment independently, or measure adoption or model fidelity. The October 12 observation above remains historical evidence.

## Hosted instance observation, October 19, 2026

[Deployment observation](instance-2026-10-19.json) records the final producer capture from 14:11:55 to 14:12:13 UTC: 282 root routes on two surfaces (564 responses), one Runtime health request, six MCP calls and five direct Runtime comparisons, for 576 requests in that capture. A separate full smoke from 14:12:36 to 14:13:30 UTC checked 156 indexed Runtime resources with GET/HEAD and the robots route. The current root was `sha-256:beaeed142e9b3898734414eeebf7ab6283ef57dbd7c2af53479405395e5a4fe4`; the historical `interpretive-governance-overview` pack at version `0.1.0` retained its separate historical root.

The record publishes hashes and scope, not raw HTTP bodies or a signed deployment attestation. Its 576-request count excludes the baseline, transition checks, earlier diagnostics and separate smoke. Operator probes may enter service telemetry. The October 12 and 14 records remain unchanged; no adoption or model-fidelity result is inferred.
