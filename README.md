![Governed Context Runtime. Give AI agents context they can verify. By Gautier Dorval.](assets/banner.svg)

# Governed Context Runtime

**Give AI agents context they can verify.**

[![Reference verification](https://github.com/GautierDorval/governed-context-runtime/actions/workflows/verify.yml/badge.svg)](https://github.com/GautierDorval/governed-context-runtime/actions/workflows/verify.yml) [![Release](https://img.shields.io/github/v/release/GautierDorval/governed-context-runtime?include_prereleases&label=release)](https://github.com/GautierDorval/governed-context-runtime/releases) [![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue)](LICENSE) [![Documentation: CC BY 4.0](https://img.shields.io/badge/docs-CC%20BY%204.0-lightgrey)](LICENSES/CC-BY-4.0.txt)

A versioned context pack brings together the sources, definitions and interpretation boundaries an agent needs for a declared task. Each pack is declared for one task, carries a reproducible version and makes its interpretation boundaries explicit. Use the reference checks to inspect what you received before passing it into an agent workflow.

By [Gautier Dorval](https://gautierdorval.com/). [Try the demo](#try-it-locally) · [English guide](docs/en/README.md) · [Guide français](docs/fr/README.md)

## A concrete use case

An assistant confuses a fictional workshop’s explanatory policy with permission to act. Select representation-gap and a language, identify the declared pack, then verify its version and boundaries before supplying it as context. The demo performs the verification steps without calling an agent.

## From selection to use

![Consumer selects; runtime delivers; consumer verifies and permits; agent answers; external evaluation remains separate.](assets/architecture.svg)

The consumer selects an intent and language. The runtime delivers the precompiled pack. Verification and permission remain local to the consumer. The agent produces its answer; any external assessment of that answer is a separate step.

## Use the hosted instance

Retrieve a declared context from [context.gautierdorval.com](https://context.gautierdorval.com/), inspect its version and sources, then decide whether to supply it to your assistant. HTTP and a separate MCP adapter expose the same prepared artifacts.

**[Connect through REST or MCP](docs/en/instance.md)** · [Parcours en français](docs/fr/instance.md) · [Dated service observation](evidence/instance-2026-10-12.json)

On October 12, 2026, a producer check confirmed eight MCP tools and matching REST/MCP bytes for the selected French pack. The integration guide explains selection, digest checks and client compatibility. These are technical service checks; model experiments remain separate.

## Try it locally

With Node.js 24.17.0 or newer, from this repository’s root:

```powershell
npm run demo
npm test
```

**Fictional example.** No installation, account or network call is needed. The demo prints `PASS` for the complete verification and for each expected rejection, ending with `VERIFIED_FICTIONAL_CONTEXT`. It uses a public test key, a fixed example clock and a teaching trust anchor.

[Inspect the demo](spec/examples/demo.mjs) · [See the complete fixture](spec/examples/synthetic/bundle.json)

## What you can verify

- The receipt matches a locally pinned root under a test key policy.
- The complete snapshot binds archive bytes, pack identities and unit references.
- Unknown profiles, conflicting labels and controlled alterations are rejected.
- Permission stays with the consumer; historical inspection cannot grant current use.

[Verification contract and v0 limits](docs/verification.md) · [Runnable checks](spec/reference/test-public-finish.mjs)

## Explore the reference

[Try the demo](#try-it-locally) · [English guide](docs/en/README.md) · [Guide français](docs/fr/README.md) · [Schemas](docs/schemas.md) · [Evidence](evidence/README.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Rights](NOTICE.md)

Reference edition 0.2.0-proposed. The contracts remain proposed. This package contains offline reference code and fictional examples; it does not bundle a hosted service or production corpus. Integrity does not establish truth, authority or model fidelity. The reference retains the gautierdorval.com instance vocabulary; it is not a qualified generic runtime for arbitrary domains.

## Licence

Code and configuration are available under the [Apache License 2.0](LICENSE). Documentation, diagrams and evidence are available under [CC BY 4.0](LICENSES/CC-BY-4.0.txt). The project identity visuals are not licensed for reuse. See [rights and licences](NOTICE.md) and the per-file [rights register](rights.json). Participation follows the [code of conduct](CODE_OF_CONDUCT.md).
