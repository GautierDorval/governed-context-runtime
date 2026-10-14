# Evidence you can reproduce

This directory separates three kinds of material: the fictional offline verification exercise and synthetic metric projection; dated producer observations of the hosted HTTP/MCP service; and model-fidelity experiments, which remain `NOT_RUN`. Start with the [October 14 service observation](instance-2026-10-14.json) for the latest dated producer record in this edition. None of these categories substitutes for another.

Run `npm test` for reference checks, the complete fictional context exercise, and the existing synthetic public-evidence projection. Run `npm run demo` for the shortest path from receipt to verified snapshot.

Both examples are synthetic. They measure no production activity, adoption or effect on model answers. Expected rejection cases are successful controls, not service incidents. The context fixture and evidence publication are distinct artifacts; their identifiers and roots must not be conflated.

The synthetic projection in `evidence/publication.json` preserves measured, measured-zero, partial, unavailable and non-applicable states. Missing values are not zero. Its digest supports integrity checks; it does not authenticate the source or prove completeness of a private source. Real-data export is not supported by this edition. Publication thresholds alone do not prevent inference across reports or overlapping periods.

The reference checks are producer validation. Documentation, a repository and a site rendering of the same evidence are one lineage, not independent confirmations. External model experiments: `NOT_RUN`. Production transport and current deployment are not established by these offline tests.

[Verification limits](../docs/verification.md) · [Synthetic publication](publication.json)

## Historical hosted instance observation, October 12, 2026

[October 12, 2026 technical observation](instance-2026-10-12.json) records eight read-only HTTP/JSON-RPC exchanges and their response digests. Its `closureReconciliation` block separately summarizes a later producer reconciliation: 20 attempted requests, of which one HEAD capture failed and was not repeated, and two complete unit records verified against the same root. The producer observed eight MCP tools and identical REST/MCP bytes for one French pack. Raw responses are retained by the producer; this public record is an observation statement, not an independently signed deployment attestation. The offline package tests do not repeat network requests or establish current availability.

The observation concerns a real endpoint but uses producer-initiated technical traffic. It is separate from the fictional context exercise and synthetic metric projection above. No adoption total or model-effect result is inferred. The [integration guide](../docs/en/instance.md) provides a bounded way to inspect the service again; a later response may belong to a different publication.

## Hosted instance observation, October 14, 2026

[Deployment observation](instance-2026-10-14.json) records the producer's post-deployment REST/MCP capture (354 requests) and root-file comparison (122 requests). The captured current root is `sha-256:d5d52ed75360d38cd1fa0e434c302d57a80ec94e9be9daaf3e8d7866fd2305e0`. A separate Python implementation verified the retained capture; it is still the producer's evidence lineage. This summary does not publish the raw responses, authenticate the deployment independently, or measure adoption or model fidelity. The October 12 observation above remains historical evidence.
