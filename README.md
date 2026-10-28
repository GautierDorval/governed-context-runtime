![Governed Context Runtime. Give AI agents context they can verify. By Gautier Dorval.](assets/banner.svg)

# Governed Context Runtime

**Give AI agents context they can verify.**

[![Reference verification](https://github.com/GautierDorval/governed-context-runtime/actions/workflows/verify.yml/badge.svg)](https://github.com/GautierDorval/governed-context-runtime/actions/workflows/verify.yml) [![Release](https://img.shields.io/github/v/release/GautierDorval/governed-context-runtime?include_prereleases&label=release)](https://github.com/GautierDorval/governed-context-runtime/releases) [![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue)](LICENSE) [![Documentation: CC BY 4.0](https://img.shields.io/badge/docs-CC%20BY%204.0-lightgrey)](LICENSES/CC-BY-4.0.txt)

Governed Context Runtime delivers precompiled, versioned context packs with sources and explicit interpretation boundaries for a declared task.

A hosted instance is available at [context.gautierdorval.com](https://context.gautierdorval.com/) over HTTP and through a separate MCP adapter. This repository provides the proposed contracts, verification tools, integration guides and runnable examples for that instance.

By [Gautier Dorval](https://gautierdorval.com/). [English guide](docs/en/README.md) · [Guide français](docs/fr/README.md)

## What you can use today

| Your goal | Available resource | Scope |
|---|---|---|
| Retrieve a declared context | [Hosted instance guide](docs/en/instance.md) | The gautierdorval.com corpus; client compatibility is documented separately. |
| Inspect and verify context artifacts | [Verification guide](docs/verification.md) | Complete snapshot verification under a separately selected trust reference. |
| Learn the verification path offline | [Local demonstration](#try-it-locally) | Fictional data and test keys; no model invocation. |
| Inspect a complete pack | [Consumer kit](docs/en/reproduction.md) | Admission, inspection and permission remain distinct. |
| Understand semantic boundaries | [Example and glossary](docs/en/pack-semantics.md) | Fictional exercise, no observed model answer. |
| Examine local evidence | [Qualification](docs/en/qualification.md) | Retained assets and local adapter, no current hosted diagnosis. |
| Prepare a comparison | [Four-condition pilot](docs/en/model-comparison.md) | 560 planned responses per configuration, **NOT_RUN**. |

The hosted service and this repository have separate publication lifecycles. This repository does not bundle a generic deployment or a production signing infrastructure.

## When context loses meaning

Illustrative example: “Available in Quebec after technical assessment” becomes “Available across Canada.” The service is recognizable, but its geographic scope and a condition have changed. The project explores how to make supplied context and its boundaries identifiable and verifiable before evaluating what an agent preserves in its answer. This fictional example is not an observed model result or an available business pack.

Each pack is declared for one task, carries a reproducible version and makes its interpretation boundaries explicit. Consumers can inspect the context they receive before using it. The fidelity of an agent’s answer is evaluated separately.

## From selection to use

![Consumer selects; runtime delivers; consumer verifies; agent answers; external evaluation remains separate.](assets/architecture.svg)

The consumer selects an intent and language. The runtime delivers the precompiled pack. Verification and permission remain local to the consumer. The agent produces its answer; any external assessment of that answer is a separate step.

## Try it locally

With Node.js 24.17.0 or newer, from this repository’s root:

```powershell
npm run demo
npm test
```

**Fictional workshop example.** The existing demonstration checks a policy that explains a workshop without granting permission to act. No installation, account or network call is needed. It uses a public test key, a fixed example clock and a teaching trust anchor. It prints `PASS` for complete verification and each expected rejection, ending with `VERIFIED_FICTIONAL_CONTEXT`.

[Inspect the demo](spec/examples/demo.mjs) · [See the complete fixture](spec/examples/synthetic/bundle.json)

## What you can verify

- The demo receipt matches a locally pinned root under a test key policy.
- The complete snapshot binds archive bytes, pack identities and unit references.
- Unknown profiles, conflicting labels and controlled alterations are rejected.
- Permission stays with the consumer; historical inspection cannot grant current use.

These checks establish integrity within the documented verification path, not semantic truth, prompt-injection prevention or the fidelity of a model’s answer. [Verification contract and v0 limits](docs/verification.md)

## Applications to explore

Business assistants, multiagent context transfers and AI response audits can benefit from identifiable context and explicit conditions. Adapted corpora, integration costs and preservation of those conditions still require evaluation. These are research and integration directions, not a catalogue of deployed business solutions. [Needs and open evaluations](docs/en/README.md#applications-to-explore)

Use a static canonical page for a simple definition or an ordinary editorial citation. A pack is useful when the consumer needs the declared selection, dependencies and integrity scope together; it adds no authority merely by being a pack.

## Explore the reference and evidence

[English guide](docs/en/README.md) · [Guide français](docs/fr/README.md) · [Schemas](docs/schemas.md) · [Evidence](evidence/README.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Rights](NOTICE.md)

The [October 19, 2026 producer observation](evidence/instance-2026-10-19.json) records the deployed service checks: 564 root-file responses, six MCP exchanges with five direct comparisons, and a separate Runtime smoke over 156 indexed resources. The [October 14](evidence/instance-2026-10-14.json) and [October 12](evidence/instance-2026-10-12.json) observations remain historical. These service observations are separate from the [synthetic publication](evidence/publication.json) and fictional demo. They do not establish continuous availability, spontaneous adoption or model-fidelity effects. The [tested-client matrix](docs/en/instance.md#tested-clients) states the clients and versions actually examined.

Reference edition 0.2.1-proposed is a prerelease of proposed contracts. Cite v0.2.1-proposed and the exact executed commit; the GitHub release records its publication. The hosted service follows a separate publication lifecycle. This repository contains offline reference code and fictional examples, not the hosted service, its production corpus or a turnkey deployment for other domains.

## Offline consumer and interpretation boundaries

Use the [English consumer kit](docs/en/reproduction.md), [French kit](docs/fr/reproduction.md),
[English pack semantics](docs/en/pack-semantics.md) or [French semantics](docs/fr/pack-semantics.md).
The [English pilot](docs/en/model-comparison.md) and [French pilot](docs/model-comparison.md) prepare four conditions and 560 responses per future configuration: **NOT_RUN**.
The [observation contracts](docs/observations.md) validate dated declarations, not production.

[Local qualification](docs/en/qualification.md) · [Qualification française](docs/fr/qualification.md) · [Reference prerelease notes](docs/release-0.2.1-proposed.md)

## Licence

Code and configuration are available under the [Apache License 2.0](LICENSE). Documentation, diagrams and evidence are available under [CC BY 4.0](LICENSES/CC-BY-4.0.txt). The project identity visuals are not licensed for reuse. See [rights and licences](NOTICE.md) and the per-file [rights register](rights.json). Participation follows the [code of conduct](CODE_OF_CONDUCT.md).

## Optional local MCP Apps companion

[English setup](docs/en/mcp-apps.md) · [Instructions françaises](docs/fr/mcp-apps.md) · [Dated qualification](records/mcp-apps-2026-10-26.md#selector-to-answer-qualification-t3-2026-10-27). Select and inspect a whole fictional pack, then explicitly request its text-tool reading. T3 completed the button-to-answer journey for one French pack in Claude Desktop 3.6556.2.0 after a prior cancellation; all 11 requested list entries matched. No real English trial or general fidelity claim. The native context-update channel remains experimental and unqualified. No public MCP Apps service deployment; comparative pilot **NOT_RUN**. [Compare the retained T3 answer offline](evidence/mcp-apps-t3-2026-10-27/README.md): exact five-list comparison, separate manual review and private producer checks. Native trials include observed functional failures and negative nonce answers; these do not establish an internal non-delivery cause.
