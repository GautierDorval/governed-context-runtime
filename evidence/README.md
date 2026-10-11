# Evidence boundaries

1. Operational measurements: none included.
2. Technical qualification: executable offline tests and existing conformance vectors under `spec/`.
3. External model experiments: NOT_RUN; no provider call or judge output.

The included publication was derived offline from an identified synthetic Data fixture, using pinned private owner archive and dataset modules before a closed export policy. It is not operational measurement. The author/operator is Gautier Dorval; local qualification is producer validation, not an independent certification. No private implementation, archive ID or Data commit is distributed here.

A public reader can reproduce reference and projection checks without private access. Reproducing private archive-to-projection derivation requires the private source and is not claimed here. Documentation, JSON and a site projection of one report would remain one evidence lineage.

## Synthetic verification example


Publication: sha-256:e03c7c3249b4e7eba0b9115af3f7c68d71d7abab7b28e7256f24bfc25d8927bd.

Population: synthetic fixtures only. Half-open UTC window: 2026-09-01 → 2026-09-07.

These rows measure no production activity. Report and metric statuses are distinct. null is not zero. No total across populations is calculated.

| UTC | Report | Metric | Type | Value |
|---|---|---|---|---|
| 2026-09-01 | measured | measured | number | 9 |
| 2026-09-02 | measured_zero | measured_zero | number | 0 |
| 2026-09-03 | partial | measured | number | 7 |
| 2026-09-04 | not_measurable | not_measurable | null | null |
| 2026-09-05 | observation_unavailable | not_measurable | null | null |
| 2026-09-06 | not_applicable | not_applicable | null | null |

Unit: count. Formula: source value without aggregation. Denominator: not applicable. Profile coverage: complete.

One lineage, no additional independent confirmation. Verifying this projection establishes neither private completeness nor current deployment.
