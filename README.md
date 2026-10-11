# Governed Context Runtime

**Give AI agents context they can verify.**

When an AI agent uses information about your organization, product or expertise, the sources, definitions and limits behind that information matter. Governed Context Runtime makes those choices explicit in a versioned **context pack**: a prepared set of information with its sources and rules for interpretation.

This repository gives developers the schemas, verification code and runnable examples to explore that approach in their own agent workflows.

[Start with the English guide](docs/en/README.md) · [Lire le guide en français](docs/fr/README.md)

## What you gain

- **A clear context for each task.** Select a declared intent and language, then identify the corresponding prepared pack.
- **A checkable version.** Verify the received content against a separately trusted reference before passing it to an agent.
- **Explicit interpretation boundaries.** Keep source authority, permitted use and limits attached to the context you provide.
- **A reproducible starting point.** Run the reference checks locally and inspect the schemas and examples.

## A concrete use case

An assistant confuses a company's product with the doctrine behind it. A consumer can select the `representation-gap` intent, choose the language and retrieve the declared context pack. It then verifies the pack and its supporting sources before supplying that context to the assistant.

That gives the integration a traceable basis for choosing context. The model's eventual answer still needs its own evaluation.

## Try the reference checks

With Node.js 24.17.0 or newer, clone this repository and run:

```powershell
git clone https://github.com/GautierDorval/governed-context-runtime.git
Set-Location governed-context-runtime
npm test
```

No dependency installation or API key is needed. The included examples exercise content verification, consumer permission checks and public evidence verification using synthetic data.

[Explore the context verification example](spec/examples/verify-context.mjs) · [Inspect the schemas](spec/context-pack.schema.json)

## Explore the design

| Your next step | Read |
|---|---|
| Understand the selection and verification flow | [English guide](docs/en/README.md) · [Guide français](docs/fr/README.md) |
| Inspect what a context pack contains | [Context pack schema](spec/context-pack.schema.json) |
| Understand the checks and their scope | [Evidence guide](evidence/README.md) |
| Contribute or reuse material | [Contributing](CONTRIBUTING.md) · [Rights](NOTICE.md) |

This is a reference package for proposed contracts, with executable examples. It does not include a hosted Runtime service or production corpus. Its tests establish technical behavior on synthetic inputs; they do not measure adoption or improvements in model answers.

By [Gautier Dorval](https://gautierdorval.com/). The site remains the canonical source of the doctrine; this repository documents the reference contracts and verification code.
