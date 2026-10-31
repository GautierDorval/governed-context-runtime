# Development property tests

`npm run test:properties` checks bounded canonicalization, parsing, archive and consumption contracts offline. It is part of `npm run test:dev`, after the existing format, strict JavaScript type and schema checks. `npm test` and `npm run demo` keep their original dependency-free entrypoints. No reference verifier, recipe, historical corpus or runtime capability changes are required by this suite.

## Reproduce the complete campaign

Use Node **24.17.0 or newer**, the exact locked **fast-check 4.10.2**, and **Python 3.14.9**. With PowerShell:

```powershell
npm ci --ignore-scripts
$env:GCR_PROPERTY_PYTHON = 'C:\Python314\python.exe' # optional if python already resolves to 3.14.9
npm run test:properties
npm run test:dev
```

The supplied brief proposed Python 3.13.18, whose [official release directory](https://www.python.org/ftp/python/3.13.18/) contains source archives but no Windows installer. The implementation selects the locally available 3.14.9 and pins that same exact version in CI. The complete differential corpus must pass under the selected version; another installed version is refused. CI prepares it with [actions/setup-python v7.1.0](https://github.com/actions/setup-python/releases/tag/v7.1.0), pinned to `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0`. Preparing that workflow is not evidence of a remote CI execution.

The lockfile adds only fast-check 4.10.2 and its resolved transitive package pure-rand 8.4.2, both MIT, as development dependencies. Their installed licence texts were reviewed. No package source is vendored, and neither package is imported by the public runtime or dependency-free entrypoints. Update licence review and the exact lock when changing either dependency.

## Domains and independent witnesses

| Profile or family | Constructed domain and expectation |
| --- | --- |
| `gd-portable-json-v1` | Valid Unicode scalars, null, booleans, safe integers, bounded arrays and objects; UTF-16 key order, no NFC. Dedicated BMP/supplementary pairs have a literal two-key expected serialization. Numeric keys, nested insertion permutations, array order, escapes and round trips have separate properties. |
| `gd-deterministic-json-v1` | Safe-integer JSON domain, NFC keys and strings, code-point key order. Indexed object keys prevent accidental normalized collisions without consulting the verifier. A separate generator deliberately constructs NFC collisions and requires their rejection. |
| `deterministic-json-sort-keys-v0` | No NFC, code-point order; safe integers and finite half-integers from -999999.5 through 1000000.5 in the Python differential generator. Raw-number witnesses separately exercise the declared magnitude and representability boundaries. This sample does not claim coverage of every possible floating-point serialization. |
| `utf8-nfc-lf-trimmed-v0` | CRLF/CR to LF, the 29 Python whitespace characters at boundaries, internal whitespace according to the recipe, then NFC and UTF-8. Explicit U+0085, U+FEFF, U+2000 and U+2001 witnesses prevent replacing this recipe with JavaScript `trim()`. |
| `attested-interpretive-unit-envelope-v0` | Literal serialization of exactly the seven historical fields. Changes to uncovered fields remain uncovered; a covered text change changes the bytes. |
| Raw input | Unparsed lexemes and bytes reach `strictParse`: literal/escaped/nested duplicates, negative zero, decimal/exponent integer forms, unsafe integers, unsupported historical numbers, malformed UTF-8, BOM, trailing content, syntax and depth. Root depth is zero: a scalar below 64 array edges is accepted; 65 is refused. |
| Archives and delivery | Four families mutate the existing fictional bundle: member sets, noncanonical envelope bytes, address/length/digest bindings, and Base64 pad bits. Fresh upstream hashes/root and fictional signing material let each test reach its announced deep refusal. The old root refuses before any reader call. Refused consumption delivers zero times; valid FR and EN controls deliver exactly once. |

Generated strings use `fc.string({unit: 'binary'})` and explicit witnesses, not the default printable-ASCII generator. Isolated surrogates are generated separately as invalid input. Ordinary recursive values have at most six levels, eight members per container and 32 code points / 64 UTF-16 units per scalar string; indexed keys are bounded to 63 units. Deliberate boundary inputs and test envelopes are separate from that ordinary-value budget. Python trees use depth three and four members to bound interchange volume. There is no verifier-based filter or rejection sampling for the valid domain.

Insertion invariance and round trips are relational checks, not independent proof. Literal acceptance vectors, the unchanged historical `spec/reference/vectors.json`, and Python provide complementary independent expectations. Archive reconstruction uses the reference functions as test construction; rejection stage/reason and delivery assertions are the actual checks, not a second independent implementation of hashing.

Python uses its standard-library JSON encoder with `sort_keys=True`, compact separators, `ensure_ascii=False` and `allow_nan=False`, plus `unicodedata.normalize` and Python `strip` for the applicable profiles. It receives bounded temporary files, not an interactive pipe protocol. Normal execution compares 5000 historical values, 1000 NFC values and 1000 text values in one exchange. Reduced novel counterexamples may require additional exchanges within the same deadline. The Python and Unicode database versions are recorded. Intentional GCR lexical rejection rules are tested separately; Python acceptance is not used to broaden them.

## Fixed seeds and budgets

| Campaign | Fixed seeds | Cases |
| --- | --- | --- |
| Canonicalization/text/unit properties | 31001 through 31013, individually named in the test file | 1000 each, except the exhaustive 29-whitespace witness (one run) |
| Literal acceptance vectors | 31100 plus fixture position | One per vector; fixture order is part of generator version `lot03-v1` |
| Raw parsing | 31201 through 31207 | 1000 each; numeric and depth boundary sets run once |
| Archives | 31301 through 31304 | 20 per family; valid and fixed-boundary sets use 31300 and 31305 once |
| Python | 31401 historical, 31402 NFC, 31403 text | 5000 / 1000 / 1000 |
| Harness controls | 31501 | Ten generated values per basic control; additional explicit failure controls |

The complete suite targets less than 60 seconds on the reference machine and has a 120-second global process budget. Python interchange/comparison has a 30-second budget, 8 MiB input and 32 MiB output limits. Each phase captures at most 8 MiB of process output. The supervisor terminates timed-out work, including a deliberately synchronous infinite-loop control. Windows uses the owned process tree; POSIX nested children inherit the outer phase's process group. Process termination and report persistence add a small cleanup interval; the Windows termination command itself is capped at five seconds. A timeout, output overflow, missing Python, incomplete report or skipped generated case fails the campaign.

The entrypoint selects explicit file lists identically on Windows and Linux. Local Windows execution does not prove Linux execution; the pinned workflow must run on its actual candidate before claiming CI success.

## Replay and reports

```powershell
npm run test:properties -- --campaign python
npm run test:properties -- --property portable-key-order --seed 31001
npm run test:properties -- --campaign mutations --mutation portable-sort --seed 31001 --path '0:0:0'
npm run test:properties -- --campaign mutations --mutation nfc-collision --seed 31007 --path '0:0:0'
npm run test:properties -- --property text-profile --seed 31009 --path '14:0'
```

`--campaign` accepts `all`, `node`, `python` or `mutations`. `--property` selects an explicit property ID and infers its campaign. `--mutation` selects one of the two controlled mutations. A reduction `--path` requires a seed and a single property or mutation. `--seed` changes the actual recorded seed and marks the run as exploratory/partial. `--timeout-ms` can only lower the global budget (50 through 120000). Only the unmodified complete fixed-seed run records `completeFixedSeedQualification: true`; a successful selected property or replay is never a full qualification. A path replay may execute fewer than the usual number of cases.

Every invocation prints its external report path. The runner creates a fresh directory below `$env:RUNNER_TEMP`, or the OS temporary directory, and refuses a report base inside the repository. `report.json` records process outcomes, versions, commit, dirty state, duration and actual counts. Per-property JSON includes the profile, seed, shrink path, generator version, declared bounds, cases, skips, reduced counterexample, subject SHA-256 and exact replay command. Mutation reports retain structured `node:test` verdicts and separate original/equivalent/mutant records. Harness-fault reproduction reruns `harness-controls`, because the deliberate fault belongs to that test setup. Internal `GCR_PROPERTY_CONFIG` and `GCR_PROPERTY_PROCESS_GROUP` values coordinate child tests; they are not runtime configuration or public command-line interfaces.

Reports are retained outside the repository for inspection. Oracle, mutant and control scratch directories are removed only after checking their owned temporary path. Tests never add discovered fixtures or repair metadata automatically. Review useful reduced inputs before promoting them to `acceptance-vectors.json`, then inventory and regenerate the package explicitly. Seed/path reproduction also requires the same generator and fast-check version.

The two reviewed injected-fault witnesses are the U+E000/U+10000 sort pair and the empty-prefix decomposed/composed acute pair, both reduced to path `0:0:0`. They are preserved as literal fixtures with mutation provenance. They demonstrate sensitivity to injected regressions, not defects in the original verifier. During implementation, the new text oracle initially expected internal U+2000/U+2001 to remain unchanged; Python independently confirmed their canonical NFC mappings to U+2002/U+2003. The oracle was corrected, the reduced `text-profile` case was replayed, and both literal mappings were retained. No historical recipe or verifier bytes were changed to absorb that difference.

## Mutation and harness validity

Each targeted mutation must match its source exactly once. Original and equivalent-comment controls must pass, and the altered verifier must fail the named property with one contractual assertion. Properties are loaded from the installed development package while the altered subject stays in an owned temporary copy, so missing `node_modules` in a copied package cannot masquerade as detection.

The adapter uses `fc.check` and its original error instance. Only an `AssertionError` is translated into a property assertion. A `TypeError`, load/process failure, exhausted preconditions or interruption remains a harness failure. Existing structured `node:test` verdict logic is reused unchanged. Controls execute a true property, an assertion violation, a TypeError, too many skipped values, an interrupted run, a blocked synchronous child, output overflow, missing Python and a deliberately false Python oracle. The latter and the assertion control must really exit nonzero. Mutation commands themselves succeed only when their expected fault is correctly detected and both valid controls pass.

## Package maintenance and scope

Add every new source and fixture to `package-policy.json`; code under `test/` and `scripts/` remains Apache-2.0, this guide remains CC BY 4.0. After formatting and reviewing changes, run `npm run regenerate`, `npm run regenerate:check`, `npm test`, `npm run demo`, `npm ci --ignore-scripts`, `npm run test:dev` and `git diff --check`. Validate the final inventoried candidate separately without `node_modules`, using `npm test` and `npm run demo`, and compare hashes/status before and after tests. CI continues to check that tests leave its worktree unchanged.

These finite offline campaigns strengthen conformity to the stated contracts. They do not establish general security, semantic truth, injection prevention, source authority, model-answer fidelity or live deployment behavior. No network readers, production keys, model calls, scheduled automation or public activation are part of the tests.
