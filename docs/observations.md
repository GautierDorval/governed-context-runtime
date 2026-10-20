# Descriptive observation contracts

The three historical producer records remain byte-for-byte unchanged. These contracts describe their published shapes and a small set of internal relationships. They do not authenticate the producer, recover response bodies, repeat a network check, or establish an independent deployment attestation.

## Local catalogue

The identifiers below are opaque local schema identifiers, not download addresses. The observation catalogue is separate from the four historical Runtime schemas and does not change `SCHEMA_EDITION`.

| Record shape | Identifier | Local file |
|---|---|---|
| October 12, `runtime-public-observation/1` | `urn:governed-context-runtime:evidence:runtime-public-observation:1` | [Request observation schema](../spec/evidence/runtime-public-observation-v1.schema.json) |
| October 14 and 19, `runtime-public-deployment-observation/1` | `urn:governed-context-runtime:evidence:runtime-public-deployment-observation:1` | [Deployment observation schema](../spec/evidence/runtime-public-deployment-observation-v1.schema.json) |

The deployment schema accepts exactly one of two closed variants: `captureAndReadbacks` or `applicationAndSmoke`. Their shapes identify the variants; no field is inserted into an old record. Unknown schema labels, missing required members, mixtures of variants and extra members are rejected. A future incompatible format needs a new version. A `PASS` or `FAIL` label remains the producer's declaration.

[The dedicated test catalogue](../test/observation-schemas.test.mjs) registers both schemas synchronously with AJV 2020, `strict: true` and `validateFormats: true`. Only internal `$defs` references are used; there is no asynchronous loader or network resolution. It registers `observation-utc` and `observation-date` with the [local date functions](../spec/evidence/observations.mjs), rather than trusting a `date-time` annotation. The test also proves that references outside this catalogue fail to compile.

From the clone root, after installing the locked development dependencies:

```powershell
node --test test/observation-schemas.test.mjs
npm run test:dev
```

`npm test` and the demonstrations retain their Node-only execution path. AJV is a development dependency. The semantic function itself uses Node/JavaScript built-ins only, receives a local parsed object and performs no I/O. Apply the matching schema before calling `checkObservationSemantics`; its returned `structuralValidationPerformed: false` explicitly records that it is not a replacement schema validator.

## Accepted date profile

The date-time format is precisely `YYYY-MM-DDTHH:mm:ss[.fraction](Z|+00:00)`: four-digit years 0001–9999, Gregorian calendar dates, hours 00–23, minutes and seconds 00–59, and an optional fraction of 1–9 decimal digits. Both uppercase `Z` and `+00:00` mean UTC. Leap-year rules include the century exception and 400-year exception. The date-only format is `YYYY-MM-DD` under the same calendar.

The validator rejects impossible dates, year zero, leap seconds, other offsets (including `-00:00`), lowercase separators, whitespace and more than nine fractional digits. This is a bounded local profile, not a claim of full RFC 3339 coverage. Published timestamps keep their exact spelling. Comparisons use integer nanoseconds, so the historical six- and seven-digit fractions are not rounded down to milliseconds. Numeric precision is not evidence of clock accuracy or independent time.

## Sequence and counting boundaries

| Record | Interval rules | Arithmetic and identity rules |
|---|---|---|
| [October 12](../evidence/instance-2026-10-12.json) | The main start precedes its end; listed request captures are ordered and inside that interval. The later closure reconciliation has a date, not an inferred second-level capture window. | `15 + 4 + 1 = 20` applies to closure attempts: retained Node requests, retained PowerShell requests and the failed HEAD capture. The eight listed requests are another population. Non-null request roots and the reconciliation's `sameRoot` match the declared main root. |
| [October 14](../evidence/instance-2026-10-14.json) | The main capture, followup readback and declaration readback each have their own start/end pair. The followup endpoint is `lastPowerShellResponseAt`. The two supplements occur after the main finish and are accepted without extending or rewriting it. No containment relation with the main interval is imposed on them. | Distinct snapshot roots cannot exceed verified entries. Ten entries representing nine roots is valid. The declaration readback root matches the declared main root. No common total is imposed on capture requests, root-file requests, Python checks, file counts, Node requests or PowerShell requests. |
| [October 19](../evidence/instance-2026-10-19.json) | The application proof and Runtime smoke each have an ordered interval contained in the overall observation window. No request timestamps absent from the report are invented. | `282 routes × 2 surfaces = 564 responses`; `564 + 1 health + 6 MCP + 5 direct comparisons = 576 application requests`. The discovered tool list length matches `toolsListed`. Only the four explicitly current MCP artifacts must match the current root. The historical pack retains its own root. |

All numeric counts are non-negative safe integers. Missing members are rejected, never replaced with zero. The 156 indexed resources in the October 19 smoke are resources, not a published request total; multiplying by its GET/HEAD method list or adding 156 to 576 would invent a count. Counts do not measure adoption, people, independent organizations or model invocations.

For declared `PASS`, the local checker also refuses contradictions it can actually see: a non-200 request in the October 12 list, false same-root/schema declarations in the October 14 followup, or nonzero smoke exit code/nonempty candidate differences on October 19. It does not recalculate every prose claim or infer missing success from a consistent record.

## Meaning of the result

The returned `declaredStatus` is copied from the record. `consistency` is separately `CONSISTENT` or `INCONSISTENT` for the enumerated relationships, with property paths and bounded diagnostic codes. A record declaring `FAIL` can be internally consistent. A schema-valid `PASS` can be inconsistent. Neither a schema match nor local consistency proves that the recorded exchanges happened.

All three records declare `rawResponsesPublished: false` and `modelInvocation: false`. This historical profile requires those declarations; a future record publishing response bodies needs an appropriate changed contract. Hashes can identify retained captures but cannot reconstruct them. Accordingly, the checker returns `responseBodiesRechecked: false` and `hostedObservationRepeated: false`. It does not promote a source-commit declaration into a verified deployment, a separate Python implementation into an independent organization, or a historical root into the current discovery root.

The negative tests cover missing members, unknown/mixed variants, malformed digests, invalid counts and dates, impossible or misplaced intervals, submillisecond reversals, inconsistent totals, request order, current-root disagreement and declared-success contradictions. Historical SHA-256 guards additionally prevent the test fixtures from being silently rewritten to satisfy the new contracts.

[Evidence and provenance](../evidence/README.md) · [Hosted diagnostic dossier, NOT_RUN](hosted-diagnostics.md)
