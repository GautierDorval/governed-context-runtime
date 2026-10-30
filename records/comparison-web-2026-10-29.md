# Web publication of the fictional comparison catalog, 2026-10-29

This extension publishes the already qualified comparison catalog as an independently hosted bilingual Web interface. It does not modify the comparator, admission rules, verifier, historical fixtures, real private inputs, hosted Runtime service or MCP adapter.

## Build and trust boundary

`prepare.mjs` records the source commit, tree, clean/dirty state and artifact-source hashes when materializing outside the reference checkout. `web-build.mjs` refuses changed materialized sources and dirty sources unless explicitly built with `--qualification`. Publication must use a clean source and a version.json with both sourceDirty and qualificationOnly false.

The builder computes all eight ordered same-language pairs with the existing bounded comparison worker, including four self-comparisons. It asserts complete status, fictional identities and empty errors, then applies the same identity/coverage acceptance as the UI. All originals remain in each complete report. The historical engine and full snapshot admission still execute in Node during construction; no browser substitute verifier is introduced.

Reports have content-addressed filenames. The browser manifest is embedded in the built application; only its allowed same-language pairs can be requested. Reads are same-origin, credential-free, redirect-refusing, bounded to the declared length (at most 8 MiB) and timed out. SHA-256, selection identity and complete coverage must all pass. Compressed HTTP Content-Length is not confused with the length of decoded bytes. Cancellation or selection changes invalidate pending results.

This is a fixed fictional catalog, not a document-upload or dynamic comparison service. Its same-origin digests establish publication consistency, not independent trust or authenticity. No pack is sent to a model, no MCP endpoint is added and no remote source URL is fetched. Existing local CLI and MCP Apps behavior remain available.

## Interface and reproducible checks

The pages use the existing comparison cards, category filter, original-content sections and complete JSON export. FR/EN paths and language links are explicit. Hosted labels describe loading a precomputed report. The dependency lockfile is unchanged and the public reference still has no runtime dependencies.

From an externally materialized artifact:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build
node web-build.mjs
npm test
```

The builder requires a fresh output directory. For uncommitted local qualification only, use `node web-build.mjs web-dist --qualification`. This flag is visible in provenance and disqualifies the result from publication.

`test/web.test.mjs` exercises successful loading, forbidden pairs, wrong status/type, byte truncation/overflow, altered bytes, compressed responses, off-origin manifest injection, cancellation and timeout. `test/browser-web.mjs` uses real local HTTP and Chrome to exercise all eight pairs at 390x844 and 1365x900, exact export bytes, filters, altered reports and cancellation. Its external Puppeteer dependency is a test harness, not an application dependency. The local qualification completed 99 companion tests, 16 browser pair cases and eight browser refusal/cancellation cases.

## Publication and reconciliation

Target Worker: `gcr-pack-comparison`, Cloudflare account's existing `ctvf.workers.dev` subdomain. Target paths: `/fr/`, `/en/`, `/version.json`. It serves static assets only; there is no new model integration, secret, database or business API. The source is in the public Runtime repository; an exact successful CI and archived asset hashes precede publication. Verify the provider deployment, exact served SHA, report bytes and real mobile/desktop operation after upload.

The site's `version.json` identifies the actual published source. Local qualification is not live proof. Retain the final publication receipt with the PR and the private mandate evidence. The two explanatory sites require corresponding FR/EN availability and entry links under their own repository authorization before claiming synchronization of the three public surfaces.

The package inventory adds only Web source/configuration, targeted tests and this record under existing licence rules. No fixture, schema, engine profile, edition, historical evidence or root dependency policy changes.
