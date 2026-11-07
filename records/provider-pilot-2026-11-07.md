# Provider pilot implementation, 2026-11-07

This record describes the implementation candidate, not a production or scientific result. [English operation guide](../docs/en/provider-pilot.md) · [Guide français](../docs/fr/provider-pilot.md).

The owner authorized the 560-response campaign with Haiku 5.5, two distinct automatic judges (DeepSeek V3.2 on DeepInfra and Mistral Large 4), a shared USD 50 provider ceiling, production delivery and continuous Observatory monitoring. The implementation preserves the existing four-condition protocol and exact documentation inputs. Its transport and budget invariants were informed by InferensLab's separation of capture, spending authorization and accepted judgment; InferensLab's repository and experiments were not changed.

Local tests cover exact request bytes, completed empty/refusal/limited responses, partial transport failures, single eligible retries after the initial pass, conditional budget reservations, crash recovery, immutable input pins, rejected judgments, raw agreement and undefined kappa. A complete synthetic run retained 560 responses and 1120 annotations, with 1683 simulated sends including three preflights. It returned `SYNTHETIC_RUN`, not `RUN`.

The local Cloudflare workerd check found and corrected a Workflow serialization issue: the approved-input snapshot must be a plain object. It then exercised real local R2 conditional writes, Workflow registration, a simulated HTTP 429 with no platform retry, and the private aggregate status route. No real provider generation occurred in that check.

The package inventory explicitly admits the new provider, execution, budget, strict JSON, judging, campaign and Workflow modules, their declarations, tests, offline packet preparation script and bilingual guides. They use Web/Node built-ins and add no runtime dependency. Historical schema, verifier, fixture, protocol and previously tagged bytes remain unchanged.

At this implementation record, deployment, real model qualification and the actual campaign result remain separate evidence to be recorded against the final immutable artifact. The reusable plan stays `NOT_RUN`. Provider result records belong to a separately pinned private campaign, with public claims limited to verified aggregate findings. No general causal or architecture superiority claim is authorized by this pilot.

The Observatory candidate adds a 15-minute status monitor while preserving its natural daily collection. It reads existing operational evidence and the separately pinned private campaign status, retains private receipts and does not launch a collection, model request or historical recovery. Historical gaps and continuity remain reported; deployment alone cannot establish natural collection success. Access, active versions, bindings, cron and a naturally produced receipt require post-deployment verification.
