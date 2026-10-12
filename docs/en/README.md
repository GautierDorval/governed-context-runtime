# Governed Context Runtime

[Use the hosted instance: REST/MCP access and dated service check](instance.md)

**Give AI agents context they can verify.**

An assistant confuses a fictional workshop’s explanatory policy with permission to act. Select representation-gap and a language, identify the declared pack, then verify its version and boundaries before supplying it as context. The demo performs the verification steps without calling an agent.

```powershell
npm run demo
npm test
```

Node.js 24.17.0 or newer. Run from the repository root. Expected final demo status: `VERIFIED_FICTIONAL_CONTEXT`.

![The consumer selects an intent and language. The runtime delivers the precompiled pack. Verification and permission remain local to the consumer. The agent produces its answer; any external assessment of that answer is a separate step.](../../assets/architecture.svg)

The consumer selects an intent and language. The runtime delivers the precompiled pack. Verification and permission remain local to the consumer. The agent produces its answer; any external assessment of that answer is a separate step.

## The interface

A deterministic interface that delivers a precompiled context pack for a canonical intent already selected by a consumer. It does not infer intent from free text, compose a pack at request time, generate an answer or judge a model.

## Instance scope

This reference implements the gautierdorval.com instance contracts, including its closed intent vocabulary and historical identifiers. The site remains the canonical source of its doctrine. The public repository explains and tests these contracts; it creates no new authority root.

## Reference version

Reference edition 0.2.0-proposed. The contracts remain proposed. This package contains offline reference code and fictional examples; it does not bundle a hosted service or production corpus.

## Choose context

Select representation-gap when an already identified model response appears to misrepresent the published entity or doctrine. Choose the language explicitly. Fetch the closed intent registry, select its exact pack identity, and bind the payload and detached manifest to a separately pinned corpus root before use.

## Run the example

Run npm run demo from the package root. The fictional fixture includes a signed receipt, test public-key policy, expected root, snapshot and every required archive. The fixed example clock is part of the exercise, not a claim of current freshness. No installation, private account, download or model request is required. For actual use, obtain the expected root and key policy independently.

## Local permission

Verification establishes byte integrity under a declared format. The consumer then makes its own bounded permission decision. A valid JWS signature is not proof of truth, real-world identity, model fidelity, execution authority or later revocation status. DSSE and detached JWS are different formats.

## Unit integrity boundary

Verify the complete snapshot before using a unit. The historical v0 envelope covers its listed text and context fields, but not the selected source value, its type or the allowed and forbidden transformations. Their source and registry bytes are covered separately by the pinned snapshot. This establishes integrity, not agreement between a sentence and its source meaning. No semantic judge runs inside the runtime.

## Historical signatures

Historical signature inspection cannot authorize current use. The consumer path always rechecks the original receipt in current mode under its local policy. A timestamp signed by the same key is not an independent time witness. Retired keys cannot grant current permission; revoked keys are rejected even historically. Offline policy cannot establish later compromise.

## When a page is enough

Use a static canonical page for a simple definition or an ordinary editorial citation. A pack is useful when the consumer needs the declared selection, dependencies and integrity scope together; it adds no authority merely by being a pack.

## Evidence

Keep operational measurements, local technical verification and external model experiments separate. Data, a public projection, this documentation and a site paragraph can describe the same archive; they are not four independent confirmations.

## Limits

The included public evidence example is synthetic. Its digest supports integrity checks of the projected content; it does not authenticate the source. Private source completeness, current deployment, spontaneous adoption and causal effects on model answers are not established.

![A locally pinned root and key policy precede receipt verification. The complete snapshot then binds archives, profiles, pack identities, unit references, source bytes and transformation registries. Both stages must succeed before local inspection. The bundled trust reference is educational.](../../assets/verification.svg)

A locally pinned root and key policy precede receipt verification. The complete snapshot then binds archives, profiles, pack identities, unit references, source bytes and transformation registries. Both stages must succeed before local inspection. The bundled trust reference is educational.

[Verification](../verification.md) · [Schemas](../schemas.md) · [Evidence](../../evidence/README.md) · [Security](../../SECURITY.md) · [Rights](../../NOTICE.md)
