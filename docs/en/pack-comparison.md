# Compare two identified pack states

[Français](../fr/pack-comparison.md) · [Dated qualification](../../records/comparison-2026-10-29.md) · [Identity decision](../../records/comparison-identity-decision-2026-10-29.md)

The optional local companion compares B relative to A for the same pack family, intent and language. Select both states explicitly, then choose **Compare B to A**. The original example and a new fictional comparison state are available in French and English. This feature does not send context to a model. It neither selects a better state nor establishes that B officially succeeds A.

Both fictional intent catalogs are co-produced with their snapshots. They are not presented as independently supplied catalogs.

Admission first checks an independently supplied expected root, the complete snapshot and every required archive with the unchanged reference verifier. The original pack and manifest then undergo full validation against the pinned draft-2020-12 schemas using Ajv 8.20.0. Formats are not asserted; this profile is stated in each identity. Integrity, schema conformance, signature trust and permission are separate results. An unavailable or refused input never becomes an empty successful comparison.

The view groups additions, removals, changed values and calculated moves. Each operation identifies its A/B locations and retains full before/after values. Expand groups, filter by category, inspect full context and originals, or export JSON. Filtering changes visibility only. The visible count describes structural operations, not distinct rules: a root projection and its chain occurrence remain separate. Rewritten list strings are removal plus addition. Repeated values retain multiplicity and ambiguous movement attribution. No similarity score or semantic rewrite is used.

Pack, manifest, selected units and archived source bytes are all included. Equal declared URLs do not establish equal source content. Archived UTF-8 can be inspected as text; exact base64 remains authoritative. No declared URL is fetched. Equal pack structure is distinct from equal repository bytes, and no digest equality is compared across unknown scopes. For the fixed Boreal composition policy only, root-to-chain projection coherence is reported separately; causal lists have no implied equivalence. Unknown relationships stay undefined.

All raw delta branches must be consumed or the comparison fails. Every normalized operation appears in a report group and a rendered expandable item. No opaque raw delta, automatic patch, truncation or model-written interpretation is a fallback. Unknown operations refuse. Errors, cancellation, selection changes and disconnects invalidate results; late replies cannot certify another pair. Comparison requests their own cancellation and never release the independent pending full-pack reading lock. A host may not propagate cancellation; the server worker still has a 10-second deadline.

## Reproduce locally

Follow the [companion preparation instructions](../../spec/examples/mcp-apps/README.md) in a fresh external directory. Its locked dependencies include jsondiffpatch 0.7.6 and Ajv 8.20.0. No runtime dependency is added to the root reference package.

For private retained archives, create a private configuration with objects A and B. Each supplies snapshotPath, archivesDirectory, expectedRoot, rootProvenance, intentToken, lang and version; expectedIntentsPath may supply a separately admitted registry array. Roots must come from an independent record or local admission decision, never copied from an unadmitted selected pack. Paths resolve relative to the configuration. The archive directory contains digest-named JSON envelopes; no network resolution occurs.

Run from the prepared companion artifact, keeping paths and reports private:

```powershell
node comparison-cli.mjs 'C:\private\pair.json' 'C:\private\new-report.json'
```

The CLI always marks its inputs as non-fictional; configuration cannot activate the coherence rule specific to the Boreal example.

The output must not already exist. The JSON export contains complete original material, including archived sources. Keep real reports in the authorized private evidence location. The browser catalog exposes only the fixed fictional examples; it is not a private file upload service. A download may be restricted by the host; the complete selectable JSON is also available in the interface. A host can read metadata: it is not a secrecy boundary.

Limits are explicit refusals: snapshot/archive 8 MiB each, total archives 64 MiB, pack 1 MiB, depth 48, 50,000 visited nodes, 1,000 array members, 5,000 operations and report 8 MiB. At most two workers run concurrently, with a 128 MiB old-generation heap budget per worker and a 10-second deadline. These are local prototype bounds, not performance guarantees for other inputs.

## Report contract

The stable envelope is gcr-comparison-report-1, profile gcr-exact-occurrences-1 and renderer gcr-comparison-cards-1. Engine/version, admission identities, scope, exclusions, equality dimensions, operations, rawCoverage, groups, presentationCoverage, coherence, originals, complete context, errors, ambiguities, editorialRelations and limits are explicit. Successful reports have status complete and empty errors; failure returns no successful report.

Operation IDs are unique within the report. Kinds are add, remove, replace and order. pathA/pathB are escaped JSON Pointers into context.A/context.B; a missing side is null and its value is absent, distinct from a JSON null value. A path under /pack is resolved against that side's exact repository-byte pack digest, language, schema digest and snapshot root. The source path and manifest provide the resolution context. Operation IDs and paths do not identify a persistent editorial rule.

Each operation retains matching policy, ambiguity flag and originating raw branch references. rawCoverage accounts for all raw operations plus the recognized array marker. presentationCoverage enumerates the exact same unique IDs as operations and groups. Metadata markers are not counted as rules. Unchanged content is available in context, so no filter can silently turn a partial view into a claim of full coverage. No editorial relation is invented; the current report contains an empty editorialRelations array.

Local automated checks and a simulated-host browser examination qualify the implementation. The real retained FR/EN comparison is an offline diagnosis, not a new hosted or real-client observation. Historical T3 remains unchanged. A business reviewer and representative organizational inputs would be required to measure practical benefit; the comparative model pilot remains NOT_RUN.
