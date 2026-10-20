# Verification contract

This is an instance reference for proposed contracts, not a generic semantic validator. Select the declared intent and language outside the runtime. The complete offline path is `npm run demo`.

![Pinned policy, receipt, whole snapshot, sources and registry, then local inspection.](../assets/verification.svg)

The consumer supplies a root and key policy before verification. The receipt must match that root. A separately verified signature is insufficient: verify the full finite snapshot, every addressed archive, declared algorithm/profile, pack identity and unit reference before using its contents. The example wrapper copies inputs before asynchronous checks and returns only after both stages succeed.

## Historical unit boundary

The v0 envelope hashes exactly `unitId`, `sourcePath`, `selector`, `claimClass`, `authorityScope`, `canonicalSource` and `canonicalText`. It does not hash the selected value, its type or transformation arrays. Source and complete registry bytes are instead bound by the whole snapshot. An isolated v0 digest must not be presented as a source-value or transformation attestation. Changed source bytes fail under the original root. A newly computed root still needs separate admission. Even an internally consistent admitted snapshot does not establish semantic truth.

## Byte profiles and addressing

[Attestation recipes](../spec/attestation-recipes.json) enumerate the profiles. The portable inventory profile accepts integer lexical forms only and orders keys by UTF-16 units. Historical profiles retain code-point order and their own NFC rules; v0 and v1 are not aliases. Source selection parses the bounded historical numeric domain, including 4.6; integer-looking decimal lexemes, negative zero and out-of-domain values are rejected. Inventory and archive metadata stay in the portable integer domain.

The historical artifact registry explicitly declares its text and JSON recipes. The verifier validates both, then uses the contract’s lower-case `.json`/`.jsonld` classification. Upper-case JSON extensions are rejected as ambiguous rather than silently selecting a text recipe. An explicit conflicting profile is rejected. This is a compatibility rule, not universal content-type detection.

Archive addresses are SHA-256 of the canonical archive envelope; repository-byte digests describe decoded source bytes. The inventory root covers all inventory fields. The outer snapshot identifier must match that root. Rank transport remains `proposed-not-ratified`: an integrity check creates no global authority rank.

## Keys, dates and local permission

`jwkDigest` is SHA-256 of the complete canonical public JWK configuration, including `kid`, `alg` and `use`. It is not an RFC 7638 thumbprint. Changing those attributes changes this digest even if the mathematical key is unchanged. No silent migration or alias is performed.

The project’s detached JWS test format uses Ed25519 and an instance-specific media type. Compact `typ` without `application/` and case variants are compared as media types; verification still uses the original protected-header bytes. Unsupported types and parameters are rejected. This is not DSSE.

Historical verification can inspect an expired receipt or a retired key; it cannot authorize current consumption. Revoked keys are rejected in either mode. A signed issue date is not independent evidence of time. Current use reruns the original receipt against the current local policy. Offline verification does not establish later compromise or revocation. The demonstration’s fixed clock and bundled key are deliberately educational.

Historical inspection is available through `verifyTestReceipt` in `spec/reference/signatures.mjs`. Set `mode: 'historical'` in its fourth argument: `verifyTestReceipt(artifact, jwks, policy, {expectedRoot, now, mode: 'historical'})`. It takes a separate JWKS (`{keys: [...]}`); its `policy.keys` entries are `{kid, jwkDigest, status, notBefore, notAfter}` rules, unlike the consumer's entries that include `jwk`. It also requires `minimumSequence` and `maxAgeSeconds` to be positive safe integers, and `clockSkewSeconds` to be a non-negative safe integer, even in historical mode. Historical mode skips the current-use sequence, active-key and freshness checks; it still validates the policy structure and refuses revoked keys.

The `now` option in the fourth argument must also be a safe integer in both modes, even though historical mode does not use it for freshness. Invalid numeric policy fields produce `verifier_policy_missing`; an invalid `now` produces the same error after the signature and root checks succeed.

The consumer wrapper `decideConsumption` evaluates current use only. It presents every known key to the technical receipt verification. Only after that verification succeeds does it apply the local disposition: a retired or revoked key then returns `KEY_NOT_ACTIVE` at stage `LOCAL_DISPOSITION` with `signatureValid: true`. A technical failure takes precedence, for example `invalid_signature` or `freshness_policy` at stage `TECHNICAL_VERIFICATION`. `verifyTestReceipt` itself rejects a revoked key with `key_revoked`. Both paths refuse a revoked key; the reason names the layer that refused.

## Update boundary

This edition pins one expected root. A valid signature for a different root is rejected. It does not implement automatic updates, persistent anti-rollback state or an external timestamp service. Those are separate consumer-profile designs; the TUF threat model is relevant, but its timestamp metadata is not itself an independent RFC 3161 timestamp.

## Reproduce

```powershell
npm run demo
node --test spec/reference/test-public-finish.mjs
```

Tests cover declared profiles, archive metadata, unit references, v0 scope, bounded numbers, JWS header bytes and historical/current separation. The test count belongs to the tested revision, not to a permanent security claim.

## Canonical envelopes and effective coverage

Every archive is checked against its raw-byte digest and address, parsed strictly,
then compared byte for byte with its portable canonical envelope. Whitespace,
property reordering or a trailing newline is refused as `noncanonical_archive_envelope`
even if an operator recalculated and admitted a new root. This is a representation
check, not a claim that the original root was bypassed. Source bytes inside
`contentBase64` retain their historical profiles; they are never trimmed to make
an envelope pass.

`unitDigestCoverage` uses the same immutable seven-field definition as the v0
preimage calculation. Optional `requiredFieldsInPreimage` metadata must describe
exactly that set with unique strings; a permutation is accepted with stable report
order. If the metadata is absent, those seven fields are still hashed. This corrects
the former report that returned an empty coverage list without changing the preimage.
A recognized selected-value profile reports no directly covered record fields;
a present nonempty field declaration is refused. A missing recipe or unknown profile
is still an error. Returned coverage lists cannot change future verification.

`policyDigest` identifies the full local evaluation, including `now`, not only stable
rules. `artifactDigest` binds the receipt envelope. Neither replaces verification of
the snapshot and its archives. `consumeVerifiedPack` reruns that decision and performs
one full snapshot verification before its callback receives a selected pack. Old
decisions cannot substitute for a receipt. The caller supplies any updated policy;
there is no revocation feed or global authorization cache.

[The English reproduction guide](en/reproduction.md) and [French guide](fr/reproduction.md)
provide the finite offline CLI and the third-party report protocol.


### Library input failures

`consumeVerifiedPack` captures the policy, receipt, snapshot and optional catalogue
before its first asynchronous check. It returns `REFUSED` for domain decisions and
snapshot verification refusals. Malformed invocation types or non-cloneable inputs
reject the promise; callback failures also propagate. Library callers must handle
both outcomes. Input failures never call the consumer. The lower-level
`decideConsumption` retains its policy-before-artifact-validation contract.

### Strict archive acceptance after the P3 compatibility review

The shared snapshot verifier now requires exactly these eight own members in each
source-archive envelope: `contentBase64`, `digest`, `digestAlgorithm`, `digestScope`,
`encoding`, `schemaVersion`, `sourcePath` and `type`. Missing, additional or replaced
members, and a non-object envelope, are refused as `archive_fields`. Metadata values
still undergo the existing checks. This is a verifier acceptance restriction for
the existing wire envelope, not a new schema identifier or canonical JSON recipe.

`contentBase64` must use the standard padded base64 spelling, without whitespace
or URL-alphabet aliases. Syntax failures remain `invalid_base64`; a spelling that
decodes but does not re-encode identically is refused as `noncanonical_base64`.
In particular, unused padding bits must be zero. Empty and unpadded complete
three-octet groups are canonical when they represent the actual source bytes.
The reference explicitly chooses the decoder rejection permitted by
[RFC 4648 section 3.5](https://www.rfc-editor.org/rfc/rfc4648#section-3.5);
it does not claim that every base64 decoder must reject nonzero padding bits.

Order is preserved: inventory/root checks, raw envelope digest and address, strict
JSON parsing, canonical JSON byte equality, exact member set, metadata and source
association, base64 checks, then decoded source digest and length. A correct hash
of a deliberately rebuilt envelope does not waive any later check. Unit and pack
inspection, including the signed whole-pack consumer, use this same verifier.
No legacy-mode option or automatic normalization is introduced.

Compatibility is intentionally narrower than the pre-P3 implementation. The checked
historical and semantic fixtures, their roots and the v0 unit preimages remain
unchanged. Previously accepted custom members or noncanonical base64 spellings are
now refused, even under a newly admitted root. Producers using those representations
must rebuild conforming envelopes and inventory identities and obtain a separately
admitted receipt when applicable; consumers must not rewrite or resign them to make
a check pass. No migration, root admission or production-profile change is performed
by this reference update. The outer MCP artifact encoding is a separate boundary
and keeps its existing canonical-base64 check.

The [P3 mandate](archive-profile-p3-2026-10-20.md) records the authorized scope.
Reproduce its focused controls with:

```powershell
node --test spec/reference/test-archive-profile.mjs
```
