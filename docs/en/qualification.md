# Offline qualification, 20 October 2026

Language: English · [Français](../fr/qualification.md)

**Result: local PASS; hosted diagnosis and external reproduction remain NOT_RUN.** The current reference verifier accepted original retained envelope bytes for 11 snapshots, 59 archives per snapshot and 12 exact pack selections per snapshot (132 selections). These counts include shared archives across roots, not 649 distinct files. [Machine-readable scope and identities](../../evidence/qualification-2026-10-20.json).

## Inputs and admission

The retained producer assets belong to a known private source revision whose identity, paths, file hashes and driver code are available in the owner's private qualification record. No producer file was rebuilt or changed. The snapshot and archive bytes were read as files; envelopes were never parsed and reserialized before verification. The verifier remains byte-identical to reference base `441598c279832b5521c952de920966a486d79026`.

Roots recorded in the public producer observations of October 12, 14 and 19 were supplied separately. Other roots came from retained digest-addressed filenames. Both are producer-origin admission choices, not an external trust authority. The current root also used a separate producer intent-registry asset as expected catalogue. Historical roots lacked a separately supplied catalogue; their 12 selections came from each verified inventory. A successful selection does not imply coverage of undeclared variants.

| Root prefix | Status | Archives | Selections | Snapshot checks |
|---|---|---:|---:|---:|
| `01aef227a841…` | PASS | 59 | 12 | 1768 |
| `0b0d2f7dbb8c…` | PASS | 59 | 12 | 1780 |
| `0b509da9c22f…` | PASS | 59 | 12 | 1772 |
| `2f21783cb93f…` | PASS | 59 | 12 | 1768 |
| `367be59f84d9…` | PASS | 59 | 12 | 1776 |
| `390877e028d0…` | PASS | 59 | 12 | 1772 |
| `5fbba12e5038…` | PASS | 59 | 12 | 1780 |
| `acf7bc3923f7…` | PASS | 59 | 12 | 1780 |
| `ad6ce4927a2a…` | PASS | 59 | 12 | 1768 |
| `beaeed142e9b…` | PASS | 59 | 12 | 1781 |
| `d5d52ed75360…` | PASS | 59 | 12 | 1780 |

## MCP and lifecycle

The actual retained MCP adapter implementation was executed locally with a closed resolver binding that reads only the retained asset map. `server/discover` and 12 exact `get_context_pack` selections passed the current reader: 13 exchanges, 12 local resolver operations, zero network calls. Requests, response-body bytes, protocol headers, identifiers and their types were retained privately. These are in-memory Response bodies from a local implementation, not a network capture or execution of the complete deployed Worker. Instant replay measures no hosted latency or original stream chunk timing. The reader's synthetic SSE controls remain separate.

Each extracted artifact matched its declared transport digest and the canonical `payloadDigest` of the selected pack in the admitted snapshot. The producer serves canonical pack JSON; `payloadFileDigest` identifies the original repository-file representation, which differs. The driver explicitly selected `canonical-json`: received bytes had to equal that canonical representation, without rewriting them. `canonicalContentBound` is true and `fileBytesBound` is false. No production signature or permission was fabricated.

The retained health/lifecycle asset set is internally coherent, with one current root and 11 retained roots. Seven local comparator controls distinguish contradiction, historical retention and unresolved transitions. `schemaVersion: 0.2.0` belongs specifically to the retained `GovernedContextRuntimeHealth` object; it does not rename all Runtime schemas. Without timed hosted captures, lifecycle behavior during deployment remains NOT_RUN. The historical `initialize` 404 / JSON-RPC `-32601` record is unchanged.

The brief relays six auditor retrieval operations around 15:37–15:50 UTC on October 19. No event-level origin ledger with correlation identifiers for that window was available in the bounded local search. This is an unreconciled declaration, not six verified origin events. No raw event, historical observation or metric was changed; no blanket subtraction or provider exclusion was applied.

## Reproduce the public path

The generic [qualifier](../../scripts/qualify-offline.mjs) uses the existing verifier and pack inspector, with no network or runtime dependency. It accepts `node scripts/qualify-offline.mjs <config.json> <new-report.json>`. Paths below are relative to the config file; the output must be new and outside the package. The optional expected-intents file contains a JSON array, not the whole registry wrapper.

```json
{
  "snapshotPath": "snapshot.json",
  "archivesDirectory": "archives",
  "expectedRoot": "sha-256:<64 lowercase hexadecimal characters supplied separately>",
  "rootProvenance": "Explain the separate admission source and its limits",
  "selections": [{"intentToken": "<declared intent>", "lang": "fr", "version": "<exact version>"}],
  "expectedIntentsPath": "expected-intents.json"
}
```

Archives use `<64-hex-digest>.json` names. Remove `expectedIntentsPath` when no separate catalogue exists; the report records that limit. Exit codes: PASS 0; verifier/selection FAIL 2; missing/unusable input NOT_RUN 3; harness/environment ERROR 4. A missing archive never triggers retrieval. Reports retain input hashes, read counts, exact selections, verifier identity, Node version and limits. Unexpected exceptions are not accepted integrity refusals.

`bindMcpPack(reply, input)` separately checks envelope digest, root, complete snapshot and exact selection. Its default `repository-bytes` profile requires the file digest. Explicit `artifactByteProfile: 'canonical-json'` requires original received bytes to be canonical and match the selected canonical digest; it reports file-byte correspondence separately. No fallback chooses a profile from a failed check.

```powershell
node --test test/qualification.test.mjs
node scripts/qualify-offline.mjs --help
```

These public tests use fictional bytes. Reproducing the real qualification additionally requires owner-authorized access to retained originals, pins, catalogue, adapter revision/dependencies and the private drivers. Published hashes do not reconstruct that material. Missing hosted request/response captures, a stable deployment window and the event ledger prevent the respective hosted or traffic conclusions. No service access, external model or remote judge ran as part of the qualification.
