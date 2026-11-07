# Provider pilot execution

[Français](../fr/provider-pilot.md) · [Scientific protocol](model-comparison.md)

The optional runner executes the existing `four-condition-pilot-3` protocol. It is separate from the hosted Runtime's pack transport and admission verifier. Adding this runner does not make the Runtime select intent, answer user questions or enforce model compliance.

The first approved configuration is Anthropic `claude-haiku-5-5` as respondent, DeepInfra `deepseek-ai/DeepSeek-V3.2` and Mistral `mistral-large-4-0` as distinct automatic judges. The shared provider budget is at most USD 50, including technical preflights and retries. This is a spending ceiling, not a quoted or observed cost. The frozen plan remains a reusable `NOT_RUN` template; a separate campaign result establishes an actual `RUN`. Injected test transports produce `SYNTHETIC_RUN` only.

## Request and response boundary

The respondent receives the exact assembled prompt as one user message, with a 512-token output ceiling and no tools, retrieval, system instruction or condition identifier. Documentation never becomes a system message. Haiku thinking is disabled and effort is medium; unsupported temperature, top-p and seed settings are omitted. Judges receive the actual prompt, received response and applicable rubric, without their peer's annotation. DeepInfra and Mistral use temperature 0 and top-p 1; Mistral uses high reasoning effort and standard-only service. Exact request bodies and parameters are retained privately.

Each request makes one bounded HTTP dispatch to its fixed provider endpoint. Redirects, invalid UTF-8, duplicate JSON keys, wrong model identities, unsupported response shapes, tool calls, inconsistent usage and unknown finish reasons are rejected. Error messages and headers are not copied into records. Credentials are supplied through secrets and are excluded from retained request and response bodies, including literal and JSON-escaped echoes.

Completed empty, whitespace, refusal and output-limited responses retain their raw content and finish reason. They are never retried to obtain a better answer. A technical error retains available partial bytes separately and receives no semantic judgment. One eligible technical retry occurs after the planned first pass, with the same input and trial identity. A completed invalid judge output stays rejected; there is no automatic repair prompt.

## Durable execution and budget

Cloudflare Workflows caches bounded steps; its automatic retries are disabled. R2 stores immutable inputs, requests, outcomes, annotations and journals. A conditional-write budget ledger covers all three providers. Before HTTP, it reserves a conservative full-context input bound plus the output ceiling, using exact decimal arithmetic rounded upward. Verified usage settles to a conservative price-based upper bound. Unknown cost retains the whole reservation. These amounts are not invoices.

A reservation without a retained outcome cannot be dispatched again under the same attempt identifier. An outcome retained before a crash can be settled without sending again. Storage failures, expired authorization or an exhausted budget stop execution. Three technical smoke requests, one per model, run before the 560 trials and use the same ledger. A failed smoke stops the campaign.

The execution packet pins the source commit, Worker bundle hash, all nine protocol inputs, metadata evidence, price verification time, owner authorization and expiration. Metadata and prices must be at most 72 hours old at admission. The packet is immutable after launch. A corrected packet needs a distinct campaign identity; changing stored bytes cannot silently resume the original campaign.

`scripts/prepare-pilot.mjs` prepares the private packet offline from those reviewed inputs. It neither uploads nor calls providers. Output must be outside the public package, and the destination must not already exist. Its arguments are `--campaign`, `--preflight`, `--token-measurements`, `--bundle`, `--source-commit`, `--expires`, `--pricing-verified`, `--authorization` and `--output`. Preparation validates the packet but does not independently certify its metadata or authorize a launch.

## Judgments and reporting

The two original annotations remain separate. The validator enforces applicability, exact response excerpts and empty-response precedence. Descriptive counts retain case, language, condition, dimension and reviewer, including valid unpaired annotations. `evaluable` means PASS or FAIL for that applicable dimension; `notEvaluable` means UNSCORABLE. Missing judgments and NOT_APPLICABLE are separate. No single global evaluability or quality score is invented.

Agreement uses paired annotations only, with contingency tables, margins, observed agreement, expected agreement and Cohen's kappa before arbitration. Kappa remains null when no pair exists or expected agreement equals one. Missing or rejected annotations are not imputed. Trial metadata preserves case/language/repetition pairing across conditions. Seven cases in one fictional service do not establish general architecture superiority or a verifier effect.

## Private operations and evidence

The Worker has no public route or workers.dev exposure. Its service-bound `/internal/pilot-status` reader exposes only pinned campaign identity, Worker version, attempt counts, budget reservations and activity time. The Observatory consumes this aggregate through a private service binding and its existing Access controls. It rejects a different campaign, manifest or deployed Worker version. Thirty minutes without recorded activity is reported as stale; this is an activity check, not proof of the Workflow's control-plane state.

Raw prompts, responses and judgments remain in private R2 and private Workflow step state. No automatic deletion, public raw-data export or email alert is enabled by this runner. Workflow retention follows the platform configuration; R2 evidence is retained until a separately authorized retention action. Final evidence must distinguish local tests, real provider observations, code deployment, campaign progress and completed analysis. See the [dated implementation record](../../records/provider-pilot-2026-11-07.md).
