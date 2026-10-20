# Fictional Quebec service boundaries

This independent teaching example describes **Boreal Workshop**, an invented technical service available in Quebec subject to a favourable project-specific assessment. It is no offer by Gautier Dorval. The statements, cases and illustrative answers were authored for the exercise. Model experiment status: **`NOT_RUN`**.

The [French](../../../docs/fr/pack-semantics.md) and [English](../../../docs/en/pack-semantics.md) guides explain each field, what verification checks and what remains a consumer decision. The [comparison protocol](../../../docs/model-comparison.md) prepares a future experiment; it reports no model result.

## Run from the repository root

Use the Node.js version required by `package.json`. These commands use local files only:

```powershell
node spec/examples/semantic-boundaries/demo.mjs fr
node spec/examples/semantic-boundaries/demo.mjs en
node --test test/semantic-boundaries.test.mjs
```

Schema checks need the locked development dependencies, installed with `npm ci --ignore-scripts` if necessary:

```powershell
node --test test/semantic-boundaries-schemas.test.mjs
```

The demo calls the shared [inspectVerifiedPack](../verified-pack.mjs) consumer. It supplies `representation-gap`, an exact language, `semantic-boundaries-1`, the fixture's separately passed intent list and the root read from [expected-root.json](expected-root.json). It never copies an incoming snapshot's root into the trust input. That separate file is a deliberately bundled teaching anchor from the same producer, not independent third-party trust. Likewise, `expectedIntents` is passed as a separate API argument but read from this bundle; `independentlySuppliedCatalog: true` describes the API parameter boundary, not a third-party attestation or independently sourced catalogue.

Verification covers the complete snapshot and keeps its own archive bytes before selecting a pack. The result contains the complete pack and manifest, selected source values, unit scope, source references and `snapshotChecks`. The explicit limits remain `signatureTrust: not-established`, `usePermission: not-evaluated` and `modelUseObserved: false`. The example does not issue a signature or evaluate an action permission. The older signed example remains available through `npm run demo` and its bundle is unchanged.

## Inspect without decoding the bundle

- [content.json](content.json): the single authored bilingual source of facts, conditions, rules and relations. Each condition is authored once per language inside the applicability chain; root-level pack lists are generated from it.
- [fr.pack.json](fr.pack.json) and [en.pack.json](en.pack.json): complete packs with substantive causal context, applicability chain, weighting rule and two answer boundaries.
- [fr.manifest.json](fr.manifest.json) and [en.manifest.json](en.manifest.json): payload identity and associations.
- [bundle.json](bundle.json): complete snapshot, twelve source archives, registries, fourteen units and ten graph nodes. All sources required by the reference verifier are captured.
- [scenarios.json](scenarios.json): seven paired teaching cases, admissible illustrative responses and error criteria; no observed responses or scores.
- [comparison-map.json](comparison-map.json), [French text](fr.canonical-text.md) and [English text](en.canonical-text.md): exhaustive pack-to-text correspondence, exact file digests and measured byte/Unicode lengths.

The full schema fixes some identifiers to the historical instance profile. URLs on `gautierdorval.com` in the fixture are inert locators resolved exclusively from local archives, never network targets. The fictional capability's `example.invalid` URLs are external identifiers, not retrieved evidence. The immutable manifest schema requires `generatedBy: build_governed_context_packs.py`; this is a schema compatibility token, **not the actual generator's identity**. The bundle explicitly records [generate.mjs](generate.mjs) as its real generator.

The fourteen restriction units use `selected_unit_only` and `deterministic-json-sort-keys-v0`. Their unit digests cover selected arrays. Their complete records, including declared transformations, are bound by the snapshot; those fields are not directly covered by the selected-value unit digest. No global authority or factual truth is inferred.

The example's local rule requires both activation conditions, treats missing evidence as unresolved and retains conflicting evidence pending clarification. This is a declared teaching convention. The general Runtime schema defines no universal condition evaluator or conflict resolver. The demo displays illustrative answers; it neither classifies new free-text answers nor claims semantic enforcement.

## Deterministic fixture maintenance

The generator accepts only this fixed teaching source. It uses no clock, randomness, network, model, signing key or third-party runtime dependency. Its read-only check regenerates the expected bytes in memory:

```powershell
node spec/examples/semantic-boundaries/generate.mjs --check
```

After a deliberate edit to `content.json`, rebuild only this example's nine derived files:

```powershell
node spec/examples/semantic-boundaries/generate.mjs --write
node --test test/semantic-boundaries.test.mjs
node --test test/semantic-boundaries-schemas.test.mjs
```

Review the new pedagogical root and both text representations. Update any documentary counts if they change. This command does not touch the historical bundle, schemas, recipes or package registries. Package inventory and rights remain subject to the repository's separate [maintenance procedure](../../../MAINTAINING.md).

Schema tests use their own local AJV instance and the same four unchanged historical schema files. They reject incomplete causal, chain and rule objects. Node-only tests verify source and graph resolution, missing/altered archives, rejection under a wrong root before archive access and exact correspondence of all 129 terminal pack values per language. Equality of those values is not a measured improvement in model behaviour.
