# Governed Context Runtime

**Give AI agents context they can verify.**

This guide is for developers who want to choose the information an agent receives, identify its version and check its sources before use. A context pack brings that information and its interpretation boundaries together in a prepared, verifiable unit.

For example, when an assistant confuses a product with the doctrine behind it, the consumer can select the corresponding intent, verify the declared pack and provide the resulting context to the assistant. The answer remains subject to its own evaluation.

Start with `npm test` at the repository root, using Node.js 24.17.0 or newer. The synthetic examples run without dependency installation or an API key. Then follow the selection and verification contract below.

## Selection and verification contract

A deterministic interface that delivers a precompiled context pack for a canonical intent already selected by a consumer. It does not infer intent from free text, compose a pack at request time, generate an answer or judge a model.

The project describes the transport and verification contracts. gautierdorval.com is one instance and remains the canonical source of its doctrine. This public repository is a documentation and reference implementation destination, not a new authority root.

This public reference package documents proposed contracts and provides executable verification examples. Publication of this package does not establish a current Runtime deployment, MCP activation, model use or independent certification. Historical audit verdicts apply only to their recorded candidates.

Select representation-gap when an already identified model response appears to misrepresent the published entity or doctrine. Choose the language explicitly. Fetch the closed intent registry, select its exact pack identity, and bind the payload and detached manifest to a separately pinned corpus root before use.

The context-verification example expects a snapshot, its content-addressed archives and a separately trusted root. These inputs are not included in this package; its offline tests use neutral fixtures. The proposed /v0/ routes are contracts, not verified public download locations. Obtain published inputs and a local key policy through a separately approved channel before running that example. No example sends a model request.

Verification establishes byte integrity under a declared format. The consumer then makes its own bounded permission decision. A valid JWS signature is not proof of truth, real-world identity, model fidelity, execution authority or later revocation status. DSSE and detached JWS are different formats.

Use a static canonical page for a simple definition or an ordinary editorial citation. A pack is useful when the consumer needs the declared selection, dependencies and integrity scope together; it adds no authority merely by being a pack.

Keep operational measurements, local technical verification and external model experiments separate. Data, a public projection, this documentation and a site paragraph can describe the same archive; they are not four independent confirmations.

The included public evidence example is synthetic. Its digest authenticates its projected content only. Private source completeness, current deployment, spontaneous adoption and causal effects on model answers are not established.

Document: `0.1.0`. Interface: `0.3.0-proposed`.

Local corpus, not LIVE: `sha-256:01aef227a841aa21094cbaf8f0eaa103309d6e65eb2330771da999489869976d`.

```powershell
node --test spec/reference/test-vectors.mjs spec/reference/test-consumer.mjs spec/public-evidence/test-publication.mjs spec/public-evidence/test-store.mjs
```

Run from the package root with Node.js 24.17.0 or newer. No secrets, account, private checkout or dependency installation. Tests reuse the existing conformance vectors.

<details>
<summary>Inspect the synthetic verification example</summary>

### Locally verified synthetic publication

Publication: sha-256:e03c7c3249b4e7eba0b9115af3f7c68d71d7abab7b28e7256f24bfc25d8927bd.

Population: synthetic fixtures only. Half-open UTC window: 2026-09-01 → 2026-09-07.

These rows measure no production activity. Report and metric statuses are distinct. null is not zero. No total across populations is calculated.

| UTC | Report | Metric | Type | Value |
|---|---|---|---|---|
| 2026-09-01 | measured | measured | number | 9 |
| 2026-09-02 | measured_zero | measured_zero | number | 0 |
| 2026-09-03 | partial | measured | number | 7 |
| 2026-09-04 | not_measurable | not_measurable | null | null |
| 2026-09-05 | observation_unavailable | not_measurable | null | null |
| 2026-09-06 | not_applicable | not_applicable | null | null |

Unit: count. Formula: source value without aggregation. Denominator: not applicable. Profile coverage: complete.

One lineage, no additional independent confirmation. Verifying this projection establishes neither private completeness nor current deployment.

</details>
