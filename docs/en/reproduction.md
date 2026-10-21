# Reproduce the fictional consumer offline

This kit selects a complete pack, verifies the original test receipt and the complete
snapshot, and hands the admitted content to a local fictional consumer. It uses the
same `inspectVerifiedPack` implementation as the [semantic example](pack-semantics.md).
It produces no model answer and contacts no service. The original synthetic bundle,
root and test receipt are unchanged. Node.js 24.17.0 or newer is required; Node
24.17.0 matches CI. No installation is needed for this path or `npm test`.

From the root of the chosen public checkout:

```powershell
git rev-parse HEAD
node --version
node spec/examples/reproduction/run.mjs --help
node spec/examples/reproduction/run.mjs --policy spec/examples/reproduction/policy.json --lang en --intent representation-gap --version fictional-1
node spec/examples/reproduction/run.mjs --policy spec/examples/reproduction/policy.json --suite
```

The CLI reads local files and writes JSON to stdout. It creates no files. Exit 0
means an admitted single case or a suite whose stated expectations all held; 2 means
a refused single case or invalid usage; 1 means an unexpected error or failed suite.
To save a capture, redirect stdout to a destination outside the checkout, for example
`> "$env:TEMP/gcr-reproduction.json"`. The suite has fixed selections; selection
flags apply only to a single case. `--case` selects a row of
[cases.json](../../spec/examples/reproduction/cases.json).

The separately supplied policy is a deliberate educational trust choice. Its root,
key and fixed clock are packaged with the exercise; this is not independent production
trust acquisition. The input bundle never chooses the accepted root. `policyDigest`
identifies the full evaluation configuration, including `now`; `artifactDigest`
identifies the receipt envelope, not the whole corpus. Signature, full snapshot
integrity and local permission are separate stages. The purpose remains
`inspect-context`, never action execution. Each new call must use the original
receipt and an updated local policy; this offline code cannot discover later
compromise or revoke an operation after it was admitted under an earlier policy.

The useful result groups `content.pack`, `content.manifest`, selected `content.units`,
source bytes in `content.sources` (base64, with source paths and repository digests),
verification scope and decision bindings. Sources are taken from the same private
archive copies that were verified. No canonical URL or schema identifier is followed.
Selection is exact: no language, intent or version fallback. The callback trace
`CONTENT_DELIVERED_TO_FICTIONAL_CONSUMER` records a local handoff, not understanding.

## Cases and existing coverage

[cases.json](../../spec/examples/reproduction/cases.json) states fixed expectations:
nominal FR/EN, wrong root, altered signature, unsupported algorithm, missing/altered
archive, missing intent/language/version, disallowed key/purpose, expiry, revocation
and caller-owned archive mutation. Every negative case requires zero consumer calls.
The `historical-v0` witness additionally shows that changing un-hashed record fields
leaves the isolated digest unchanged but fails the original complete inventory root.
A newly coherent corpus requires separate root admission and still proves no truth.

The broader deterministic integration tests are in
`spec/examples/test-verified-pack.mjs`: input capture during a controlled wait,
pack/registry identity mismatch under a recomputed root, a second decision after
revocation, and refusal of a previous decision offered instead of a receipt.
`spec/reference/test-consumer.mjs` already covers invalid policy before artifact
access, signer accessors, error priority and historical/current separation.
`spec/examples/test-verified-unit.mjs` covers full-record membership and the effective
v0 coverage declaration. The finite [MCP reader](../../spec/examples/read-mcp-response.mjs)
is tested separately with synthetic JSON/SSE; the kit itself reads local files.

## Identity and an outside run

[manifest.json](../../spec/examples/reproduction/manifest.json) lists required files,
byte counts, SHA-256 hashes and profiles. The CLI checks them before running cases;
`kitDigest` identifies the manifest. This is content identification, not authorship,
semantic truth or a signature. The manifest cites the starting reference commit;
it deliberately does not embed its own containing commit. Record the final Git
commit separately with `git rev-parse HEAD` and the kit digest in the report.
After a reviewed source edit maintainers explicitly run
`node spec/examples/reproduction/build-manifest.mjs`, then regenerate the package.
Verification never repairs the manifest.

Use the [report template](../../spec/examples/reproduction/report-template.json).
A future outside reproducer chooses a clean environment and exact public commit,
follows only the public instructions, and records UTC time, environment, declared
role and relationship to the producer, commands, exit codes, cases, captures,
differences and limits. No personal identifier beyond the necessary declared role
is required. Retain disagreements and NOT_RUN cases. Do not send the report through
this tool; the present mandate prepares the protocol without contacting anyone.

`PREPARED` means the protocol exists. `PRODUCER_REPRODUCED` describes the producer's
local run. A received outside report becomes `EXTERNAL_RUN_REPORTED`; only review
of its evidence can support `EXTERNAL_REPRODUCTION_VERIFIED`, limited to the executed
cases. Exterior reproduction remains `NOT_RUN` until such a report exists. Reusing
this verifier demonstrates reproducibility, not independent cryptographic
implementation. The separately written Python client previously run by the producer
on loopback remains an implementation-level result; this kit does not export a
private client or convert it into organizational independence.

## Cost and limits

`node spec/examples/reproduction/benchmark.mjs` measures the actual local stages
with a monotonic clock, 5 warmups and 40 samples, including raw samples, median and
p95. File loading is separate. `--baseline <local-export>` compares the same old
full receipt/snapshot path on identical bytes. There was no old whole-pack consumer;
its new cost is reported separately. These are local observations, not universal
latency targets, hosted performance or agent latency.

No production observation, source-build provenance, current revocation service,
assistant compatibility, organizational independence or semantic benefit follows
from a successful exercise. [The model comparison](model-comparison.md) is a
separate prepared protocol marked NOT_RUN. Development qualification alone needs
`npm ci --ignore-scripts` followed by `npm run test:dev`; its schemas resolve locally.


## Single-case selection and library errors

For a single nominal run, the default case follows `--lang en|fr`. Explicit
`nominal-en` and `nominal-fr` case IDs require the matching language; contradictory
flags are refused with `case_language_mismatch`. Use the fixed `wrong-language`
case to reproduce an undeclared-language refusal through complete verification.
At library level, malformed invocation types and non-cloneable objects reject the
promise; domain refusals return `REFUSED`. The CLI catches both and never forwards
content on failure. See the [input contract](../verification.md).


## Reference prerelease and qualification

Reference prerelease `0.2.1-proposed` is identified by its remote tag and GitHub release. Cite that tag and the exact executed commit; `v0.2.0-proposed` still identifies its historical bytes. [Offline retained-byte qualification](qualification.md), [four-condition pilot, NOT_RUN](model-comparison.md) and [release notes](../release-0.2.1-proposed.md) describe separate scopes. The signed fictional kit remains distinct from the unsigned semantic example.
