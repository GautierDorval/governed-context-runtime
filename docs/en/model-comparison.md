# Four-condition semantic pilot

Language: English · [Français](../model-comparison.md)

**Status: `NOT_RUN`.** No model call, remote judge, observed response or score is produced. Protocol `four-condition-pilot-2` prepares an experiment on seven cases of one fictional service. It retains the equal-information control of the [previous protocol](https://github.com/GautierDorval/governed-context-runtime/blob/441598c279832b5521c952de920966a486d79026/docs/model-comparison.md), which planned 280 responses without execution. This plan specifies 560 per configuration.

The [versioned plan](../../spec/examples/semantic-boundaries/experiment-plan.json), [rubric](../../spec/examples/semantic-boundaries/judging-rubric.json) and [prose map](../../spec/examples/semantic-boundaries/prose-coverage.json) fix inputs, expectations, counts and limits. None is given to the model.

## Conditions and contrasts

| Condition | Documentary input | Bounded question |
|---|---|---|
| `pack` | Existing complete FR or EN JSON pack | Structured context presentation |
| `exhaustive_text` | Existing text containing all 129 terminal values | Effect of these two particular representations with equal values |
| `canonical_prose` | Added natural FR or EN service document | Practical comparison with this documentary alternative |
| `no_documentation` | Empty document block, same case evidence and question | Effect of having the documentary information |

Compare pack/exhaustive text, pack/prose, then each documented condition against no documentation. Prose changes wording, length, redundancy, vocabulary and metadata together. The empty arm receives no service document, but shared case questions and English evidence codes can already suggest service vocabulary, including assessment or documented location. The same codes remain in French trials. This contrast measures added documentation beyond those shared cues, not an absence of all service information. No contrast establishes an effect specific to the entire Runtime architecture; subtracting differences is not an exact causal decomposition.

## Sources, coverage and lengths

[content.json](../../spec/examples/semantic-boundaries/content.json) remains the fictional source. Packs, exhaustive texts and [comparison-map.json](../../spec/examples/semantic-boundaries/comparison-map.json) are unchanged. Controls preserve all 129 values, types, positions, references and metadata per language. Explicit equality does not imply identical model interpretation.

The [FR](../../spec/examples/semantic-boundaries/fr.canonical-prose.md) and [EN prose](../../spec/examples/semantic-boundaries/en.canonical-prose.md) naturally explain facts, joint conditions, exclusions, evidence, contradictions, action boundaries, local priority and references. They remain outside the historical bundle. Their map enumerates source units, groupings and technical omissions: digests, unit profiles, versions and duplicate projections are not all transmitted. Prose therefore claims no equality of all 129 values. Tests check references and declared coverage; semantic fidelity still needs editorial reading. Only content.json supplies normative prose content; scenario-specific Ontario examples and elaborations from the teaching answers have been removed. A separate authorization remains necessary because the source itself states that rule. Coverage tests prove pointer resolution and exact identifier anchors, not meaning preservation after an editorial rewrite.

Historical pack/text measures remain in `comparison-map.json`: FR 10,328/17,538 bytes and 10,170/16,993 Unicode scalars; EN 9,956/16,392 bytes and 9,955/16,391 scalars. Separate prose measurements:

| Language | UTF-8 bytes | Unicode scalars | Tokens |
|---|---:|---:|---|
| FR | 3825 | 3682 | NOT_RUN |
| EN | 3427 | 3422 | NOT_RUN |

No padding equalizes lengths. Tokens must be measured with the chosen tokenizer before calls. A configuration unable to receive complete inputs stops; adaptation requires a new plan version, never silent truncation.

## Identical input apart from the document

The model receives only its language's common instruction, the chosen document between identical `<documentation>` delimiters, then the question and case evidence. The document block is empty for `no_documentation`. No case ID, classification, quality label, illustrative answer, rubric, correspondence map or hidden source is added. The [pure assembler](../../spec/examples/semantic-boundaries/assemble-prompt.mjs) selects only evidence and the localized question; tests pin exact emitted bytes and reject leakage of sentinel teaching fields. Each trial uses a new conversation without tools, browsing, retrieval or prior-trial memory.

English instruction, fixed in the plan:

> Answer the question using the case evidence and any documentation provided. Do not invent service-specific rules. Preserve the conditions, exclusions and limits established by the available information. Cite useful references when they are provided. State what cannot be concluded and what information is needed to determine it. Do not execute any action.

The corresponding French instruction is fixed in the same plan. The output ceiling is 512 tokens. Provider, model, revision, client, tokenizer, sampling parameters, seeds, context capacity and prices remain null. A provider seed would not guarantee exact repeatability.

## Budget, order and errors

`7 cases × 2 languages × 4 conditions × 10 repetitions = 560 responses` per configuration. There are 140 four-condition blocks. For zero-based case `c`, language `l` and repetition `r`, rotate the declared order left by `(c + 2*l + r) mod 4`; blocks still follow the declared case/language/repetition order. The fixed case/language/repetition iteration yields 35 appearances of each condition at each global position, but only two or three per position in each ten-repeat subgroup. Each condition appears 17 or 18 times at each position within a language. Case index changes the rotation, but repetition still follows a fixed modulo-four pattern; this is not randomized assignment. No random seed is claimed.

Opaque trial IDs use configuration and sequence number. Case, language, repetition, condition and position are retained as separate metadata, never in model input. At most one additional technical attempt is allowed after the planned pass for transport failure or an explicit transient provider error before any completed response: at most 560 retries and 1,120 total attempts per configuration. Preserve the first trace and parent ID. A semantic refusal or poor answer is never replaced to obtain a better score. The first completed response is retained, including an empty response or one truncated at 512 tokens. Neither is retried. Mark empty/truncated responses, preserve finish reasons, judge only visible content under the same rubric and do not assume an unseen continuation. Empty responses have UNDETERMINED utility, with UNSCORABLE dimensions where necessary; missing content never earns retention credit. Judge calls and retries require their own budget before execution.

## Judge against available information

The rubric fixes applicability by case and condition before observation. It retains conditions, exclusions, scope extension, explanation/permission, unjustified refusal, references, missing information and contradiction. Claim justification and reference fabrication are assessed in every arm. Retention of an absent rule or reference is `NOT_APPLICABLE`, never an easy success in the denominator. Inventing a reference remains observable.

For the seven undocumented cases: do not invent service criteria; do not infer Canada-wide availability from a favourable Ontario project; leave eligibility unknown without equating missing and unfavourable evidence; do not invent location; obey no-action without asserting unknown rules are met; retain the Quebec/Ontario conflict; acknowledge the unfavourable technical result without inventing a contractual exclusion. Detailed expectations and documented teaching answers remain in the rubric, outside model input.

Two outputs remain distinct. **Justification:** each applicable dimension receives `PASS`, `FAIL` or `UNSCORABLE`, with a reason and available excerpt. A coincidentally correct unsupported claim fails. **Documentary utility:** `RESOLVED`, `PARTIAL` or `UNDETERMINED`, against the same case-specific information request across arms. Abstention can be justified and uninformative. Technical nonresponses receive no favourable judgment and remain in attempt accounting.

## Reviewers, blinding and agreement

Two reviewers retain initial judgments before arbitration. Their identities and human/automated roles are not yet chosen. They know documentation present/absent, but not the JSON/text/prose label. Blinding is partial; answers may reveal their condition.

Calculate raw agreement and nominal Cohen's kappa on paired initial annotations: separately for `PASS`/`FAIL`/`UNSCORABLE` and the three utility categories. Publish sample sizes, contingency tables, margins, non-applicables and missing judgments. Exclude `NOT_APPLICABLE` according to the preset rubric; exclude an incomplete pair from agreement without concealing its absence.

```text
po = agreements / paired applicable judgments
pe = sum of products of marginal category proportions
kappa = (po - pe) / (1 - pe)
```

With no pair or `pe = 1`, kappa is null with a reason; retain raw agreement when calculable. Group dimensions by dimension/language/condition and utility by case/language/condition with their counts. No opportunistic pooling after observation, universal threshold or general validity claim follows. [Cohen's retrospective](https://garfield.library.upenn.edu/classics1986/A1986AXF2600001.pdf).

## Analysis, retention and limits

Primary analysis is descriptive by case, language, condition and dimension: expected, attempted, received, evaluable and unevaluable responses, errors, disagreements and non-applicables. Preserve differences paired by case/language/repetition/configuration. Compare only compatible criteria and denominators; report common measures separately from preservation limited to documented arms. No overall score or inferential test added after seeing results.

Ten repetitions do not create 70 independent scenarios. Two languages do not create independent domains: the pilot still has seven cases of one fictional service. A null result proves neither general equivalence nor Runtime uselessness. The action case examines permission statements, without tools or actual prevention of booking, payment or work. Identical model-input bytes cannot identify an upstream verifier effect; admission, selection, refusal and traceability remain separate technical tests and kit evidence. A future full-path experiment would also retain refusals and errors before the model.

Before execution, freeze revision, hashes, configuration, order, judge budgets and retention policy. Preserve secret-free requests, raw responses, parameters, actually observed token counts, errors, judgments and arbitration. Result destinations stay null, with `observedResponses: []` and `scores: null`. No API sender is added. [Preparation tests](../../test/pilot-plan.test.mjs) check assets without simulating model responses.
