# Local schema resolution

The four JSON Schema files under `spec/` are included in this package. Their `$id` values identify schemas; they are not promises of a live download endpoint. Resolve them locally by exact mapping:

| Identifier suffix after `/spec/governed-context-runtime/` | Local file |
|---|---|
| `context-pack.schema.json` | [spec/context-pack.schema.json](../spec/context-pack.schema.json) |
| `context-pack-manifest.schema.json` | [spec/context-pack-manifest.schema.json](../spec/context-pack-manifest.schema.json) |
| `intent-registry.schema.json` | [spec/intent-registry.schema.json](../spec/intent-registry.schema.json) |
| `runtime-snapshot.schema.json` | [spec/runtime-snapshot.schema.json](../spec/runtime-snapshot.schema.json) |

The repository base is `https://github.com/GautierDorval/governed-context-runtime`. `docs/source.json.publicSpecRepositoryPath` is the full locator of the already-published compatible schema edition. The historical runtime declaration’s `spec/governed-context-runtime/` is a source-layout identifier; resolve the four listed identifiers with the explicit mapping above, not by appending that path to the public repository. Relative links resolve from each containing document in GitHub or a clone. Website links should use that absolute base and the intended published revision. No private checkout is needed. The fixture is fictional and follows the existing instance schema, including its closed intent tokens and historical `generatedBy` token. That token does not name this fixture’s generator; the bundle states its actual fictional provenance.

## Validation layers

A schema checks the structure of an object that has already been parsed. It cannot see what parsing discarded, and the historical schemas do not state every requirement of the verification profile.

| Layer | Implemented by | Covers |
|---|---|---|
| Raw parsing | `strictParse` in `spec/reference/verification.mjs` | Malformed UTF-8, lone surrogates, duplicate keys and number forms, before any object exists. |
| Structural schema | The four files above, JSON Schema draft 2020-12 | Shapes, required members, constants and patterns. `format` is an annotation under the default vocabulary, not an assertion. |
| Verification profile | `verifySnapshot` and `unitPreimage` | Requirements by scope that the historical schemas do not state, listed below. |
| Consistency | `verifySnapshot` | Digests, archives, sources, agreement between registries and the inventory, graph coverage. |
| Local policy | The consumer | Admission of an expected root, keys, freshness and use. |

## Profile requirements beyond the historical schemas

`runtime-snapshot.schema.json` describes the `0.1.0-proposed` snapshot and keeps pack, unit and graph entries open: it lists some of their required members without describing them. It is not tightened under the same identifier. The verifier adds these requirements:

| Object | Requirement | Refusal code |
|---|---|---|
| Every unit | `digestAlgorithm` is `sha-256`. | `unit-algorithm` |
| Every unit | `selectedValueType` names the type of the selected value: `bool`, `int`, `float`, `str`, `list`, `dict` or `NoneType`. | `unit-selected-type` |
| Unit with `digestScope` `canonical_interpretive_unit_envelope` | `canonicalization` is `attested-interpretive-unit-envelope-v0`; `claimClass`, `authorityScope`, `canonicalSource` and `canonicalText` are present. | `unit_recipe_mismatch` |
| Unit with `digestScope` `selected_unit_only` | `canonicalization` is `utf8-nfc-lf-trimmed-v0` or `deterministic-json-sort-keys-v0`. | `unknown_profile` |
| Pack entry of the inventory | Every member of the registry entry is present with the same value. | `pack-registry:…` |
| Graph of the inventory | Equals the nodes built from the packs, in order. | `graph-coverage` |

`test/schemas.test.mjs` runs the four schemas with a closed local catalogue and shows, under a recomputed root, that schema-valid units without these members are refused. It needs the locked development dependencies: `npm ci --ignore-scripts`, then `npm run test:dev`.

## The pinned schema edition

`docs/source.json.publicSpecRepositoryPath` points to commit `d57ee3b`, the merge of pull request #1 on October 11, 2026. The four schemas and `spec/attestation-recipes.json` have kept the same bytes from the initial package (`ca8bc8b`) through later editions; `scripts/check-package.mjs` checks their SHA-256 digests, so a change to any of them requires reviewing the locator. The reference verifier and the examples under `spec/` have changed since `d57ee3b`: for them, use the revision of this repository you are reading.

## Companion contracts

Interpretation is documented in the [English](en/pack-semantics.md) and [French](fr/pack-semantics.md) semantic guides without altering these historical schema bytes.
The [observation catalogue](observations.md) is separate from the four Runtime schemas.
The [reproduction kit](en/reproduction.md) resolves all schema identities locally.
