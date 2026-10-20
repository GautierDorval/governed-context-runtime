# Semantics of a verified pack

[Français](../fr/pack-semantics.md) · [Schemas](../schemas.md) · [Verification contract](../verification.md) · [Complete example](../../spec/examples/semantic-boundaries/README.md)

A pack transports declarations, relations and references. The schema describes their shape. Verification establishes their integrity and certain associations under the chosen root. The consumer must still establish the case-specific facts, interpret the conditions and decide on use within its own scope. None of those steps establishes that the declarations are true or that a model will respect them.

Keep three states separate:

1. **Declaration**: the pack states that a favourable technical assessment is required.
2. **Documented satisfaction**: project-specific evidence does, or does not, establish that condition. Missing evidence is neither a favourable nor an unfavourable assessment.
3. **Consumer decision**: the consumer accepts a defined local use. Explaining a condition does not authorize booking, payment or work.

The locations below follow the [complete pack schema](../../spec/context-pack.schema.json). Root-level arrays and arrays within a chain are distinct fields. The schema does not require their equivalence; in this example they derive from the same inputs and a test checks their agreement.

## Conditions and evidence

### `activationConditions`

Locations: `$.activationConditions` and `$.applicabilityChains[*].activationConditions`. These lists declare applicability conditions. For example, the project is located in Quebec and has a favourable technical assessment. They differ from evidence, which is used to establish those conditions.

The schema checks non-empty strings; the nested list must contain at least one member. The snapshot binds the declarations. The verifier neither checks the project's actual location nor executes general condition logic. The consumer must determine the relevant evidence and combination rule. The example specifies conjunction of the two conditions as a local teaching convention.

### `nonApplicabilityConditions`

Locations: `$.nonApplicabilityConditions` and `$.applicabilityChains[*].nonApplicabilityConditions`. These declare excluded situations, such as a project outside Quebec or an unfavourable assessment. Missing evidence does not automatically satisfy an exclusion.

Structure and integrity are checked, not the occurrence of the excluded situations. The consumer must distinguish established exclusion, unknown condition and contradiction. The general contract defines no universal calculation for negation, precedence or conflict.

### `requiredEvidence`

Locations: `$.requiredEvidence` and `$.applicabilityChains[*].requiredEvidence`. This field describes necessary evidence: proof of location and a dated record of a favourable assessment specific to the same project. It neither contains those documents nor certifies their authenticity.

The verifier binds the list as content; it collects, dates and assesses no external evidence. The consumer must obtain authorized evidence, check relevance and retain unknowns. A reference is not proof that a document is available.

## Inference and answer limits

### `forbiddenInferences`

Locations: `$.forbiddenInferences` and `$.applicabilityChains[*].forbiddenInferences`. The list prohibits conclusions beyond the declared scope: Quebec does not imply all of Canada, and describing a service does not establish a project's eligibility.

The check covers the structure and integrity of this declaration. The Runtime does not inspect a model response for a forbidden inference. Semantic evaluation would be separate work; the [comparison protocol](../model-comparison.md) is `NOT_RUN`.

### `applicabilityAbuseBoundaries`

Locations: `$.applicabilityAbuseBoundaries` and `$.applicabilityChains[*].applicabilityAbuseBoundaries`. These limits address extensions of applicability or authority: transferring an assessment between projects or treating a local documentary priority as universal authority.

They differ from case exclusions and prohibited conclusions, although their effects can overlap. The verifier does not decide whether a use constitutes such an extension. The consumer must preserve the scope of the case and the source.

### `answerBoundaries`

Location: `$.answerBoundaries[*]`, a `ruleRef` with `ruleId`, `sourceArtifact` and `rule`. For example, retain Quebec and the favourable assessment, report missing evidence and distinguish explanation from action permission.

The schema requires all three members. The verifier builds the corresponding node and requires the local source identified by `sourceArtifact`. A source's existence alone does not establish that it semantically justifies the rule. This example derives each rule's text from its single source and tests that association. The consumer remains responsible for its answer and limits.

### `weightingRules`

Location: `$.weightingRules[*]`, also a `ruleRef`. A local priority explains which element takes precedence within the declared scope. In this exercise, explicit restrictions take precedence over promotional paraphrases, and a contradiction requires clarification.

The graph, local reference and bytes are verified. There is no ranking score, universal conflict resolver or permission inferred from priority. The consumer must justify its own arbitration. The example does not turn its convention into a general Runtime norm.

## Situations and relations

### `causalContexts`

Location: `$.causalContexts[*]`. Each context includes `id`, `surface_topic`, `trigger`, `risk`, `latent_need`, `intended_consequence` and `forbidden_derivations`; `symptom` and `canonical_surfaces` are optional. The example connects a question about availability to the risk of promising service while omitting its conditions.

A causal context explains why the limits were declared. It is not empirical proof of causation. The schema requires a complete object. The verifier rebuilds its node and identity without validating the reasoning. `canonical_surfaces` remains a declaration; the path visits no URL.

### `applicabilityChains`

Location: `$.applicabilityChains[*]`. This object links a situation to a causal context through `linkedCausalContextId`, to a capability through `applicableCapability`, then to its conditions, evidence, exclusions and limits. It also contains `triggerSituation`, `latentNeed`, `riskClass`, `domain` and `status`.

The capability has `id`, both `canonicalServiceUrlFr`/`canonicalServiceUrlEn` and both `labelFr`/`labelEn`. In the example its `example.invalid` URLs identify a fiction and are never retrieved. The `project-assessment-chain` points to `quebec-conditional-service`.

The schema checks the complete object. The verifier requires the link to an existing causal context in the same pack and compares the rebuilt graph with the inventory. It proves neither that the capability exists in reality nor that its conditions are met. Implemented dependencies are bounded; this is not a general causal reasoner.

## Sources, units and selection

### `includedUnits`

Location: `$.includedUnits[*]`, references containing `unitId`, `sourcePath`, `canonicalSource`, `claimClass`, `authorityScope` and `digest`, with scope/profile optional in the schema. The verifier locates the complete record, compares reference members and recomputes the unit digest under its profile.

The exercise's fourteen units use `selected_unit_only` with `deterministic-json-sort-keys-v0`. Their digest covers the selected source array, not the registry fields directly. The complete snapshot also binds those fields. In the older v0 envelope profile only seven fields form the preimage, excluding the selected value and transformations: see the [verification contract](../verification.md). Integrity attestation is neither proof of truth nor permission.

### `includedArtifacts`

Location: `$.includedArtifacts[*]`. Each reference contains `path`, `sourcePath` and `digest`; `digestScope` is optional in the schema but required to equal `complete_artifact` by the verifier. The example includes `content.json`, the single readable source of FR/EN facts and relations.

The historical artifact profile depends on its extension: deterministic JSON for `.json`/`.jsonld`, otherwise text normalized under the historical recipe. Do not conflate this digest with the source-byte digest, archive-envelope digest or corpus root. The complete snapshot checks those layers and associations. The consumer must still determine source relevance and permitted use.

### `selectionBoundary`

Location: `$.selectionBoundary`. Its constants declare `agentSelectedIntent: true` and `runtimeSelectedIntentFromFreeText`, `runtimeComposedAtRequestTime`, `runtimeProducedAnswer: false`, together with an explanatory `note`.

The consumer chooses an exact closed intent, language and version. It verifies the snapshot under a separately supplied root, then extracts the pack from already verified archives. This example allows no fallback to an approximate language or version. These constants describe the contract; identical bytes alone do not prove how a server would have produced them.

## Replay the example

From the clone root, with Node.js compatible with `package.json`:

```powershell
node spec/examples/semantic-boundaries/demo.mjs fr
node spec/examples/semantic-boundaries/demo.mjs en
node --test test/semantic-boundaries.test.mjs
node --test test/semantic-boundaries-schemas.test.mjs
```

Schema tests require the locked development dependencies. The demo and other tests use Node only. Output includes the pack, manifest, units, source references and limits: `signatureTrust: not-established`, `usePermission: not-evaluated`, `modelExperiment: NOT_RUN`. The root in [expected-root.json](../../spec/examples/semantic-boundaries/expected-root.json) is a teaching anchor kept separate from the bundle and delivered by the same producer; it is not independent trust.
