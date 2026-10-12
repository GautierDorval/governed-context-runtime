# Use the gautierdorval.com instance

An assistant may need to explain a doctrine without confusing it with a product or permission to act. The Runtime supplies a prepared context: a declared intent, language, version, sources and interpretation boundaries. The integrator can inspect that set before passing it to the assistant.

The instance is available at **[context.gautierdorval.com](https://context.gautierdorval.com/)**. It serves the same artifacts over HTTP and through a separate MCP adapter. This repository provides reference contracts and verifiers; the hosted service and its corpus have their own publication lifecycle.

## Observed status

On **October 12, 2026 at 02:18 UTC**, a producer technical check confirmed HTTP responses, discovery of eight MCP tools and exact equality of the French `representation-gap` pack received through both transports. The observed registry contains six intents and twelve FR/EN packs. The Runtime declares `0.3.0-proposed`; this repository’s reference edition remains `0.2.0-proposed`. Those versions identify different components.

[Dated observation and response digests](../../evidence/instance-2026-10-12.json) · [Evidence scope](../../evidence/README.md)

This observation establishes the described behaviour at that time, without guaranteeing future availability. These checks are producer-initiated technical traffic, with no model invocation. They do not measure adoption or the effect of context on an answer.

## 1. Select a declared context

Read the registry before choosing an identifier. For example, `representation-gap` supports examination of an already identified gap between a representation and published sources. The Runtime does not infer that intent from free text.

```powershell
$runtimeOrigin = 'https://context.gautierdorval.com'
$intents = Invoke-RestMethod "$runtimeOrigin/v0/intents"
$pack = Invoke-RestMethod "$runtimeOrigin/v0/packs/representation-gap/fr?version=0.1.0"
$manifest = Invoke-RestMethod "$runtimeOrigin/v0/packs/representation-gap/fr/manifest?version=0.1.0"
```

These commands read the data. PowerShell’s JSON conversion does not preserve the original bytes for cryptographic verification. Keep the received body before decoding when comparing digests, or use the MCP envelope below. This example selects French explicitly; use `lang = 'en'` and the corresponding English REST path when selecting English.

## 2. Verify before use

Pin the expected corpus root separately in the consumer’s local policy. Read the [snapshot](https://context.gautierdorval.com/v0/snapshot), verify its root, then every referenced archive with the [public verifier](../../spec/reference/verification.mjs). Then check the selected pack’s identity, version and digest against that snapshot. The [verification contract](../verification.md) defines the scope of these checks.

A root or digest delivered with the content can establish consistency, but does not by itself create an independently trusted reference. A matching digest proves neither truth nor authority. Permission to use the context remains with the consumer. The demo’s signatures and keys are for testing; they are not a production trust chain.

To learn the complete flow with a fictional fixture and all its archives:

```powershell
npm run demo
npm test
```

## 3. Read the same pack through MCP

The adapter accepts `POST https://context.gautierdorval.com/mcp`. Its served profile uses revision **`2026-07-28`**, `server/discover` discovery and the per-request metadata below. A client requiring the older `initialize` exchange is unsuitable for this profile. Compatibility with a particular application needs verification; an MCP URL alone does not establish it.

```powershell
$mcpUri = 'https://context.gautierdorval.com/mcp'
$mcpVersion = '2026-07-28'
$mcpMeta = @{
    'io.modelcontextprotocol/protocolVersion' = $mcpVersion
    'io.modelcontextprotocol/clientInfo' = @{
        name = 'runtime-reader'; version = '0.1.0'
    }
    'io.modelcontextprotocol/clientCapabilities' = @{}
}
$mcpHeaders = @{
    'Accept' = 'application/json'
    'MCP-Protocol-Version' = $mcpVersion
    'Mcp-Method' = 'server/discover'
}
$discoveryBody = @{
    jsonrpc = '2.0'; id = 1; method = 'server/discover'
    params = @{ _meta = $mcpMeta }
} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri $mcpUri -Method Post -ContentType 'application/json' `
    -Headers $mcpHeaders -Body $discoveryBody

$mcpHeaders['Mcp-Method'] = 'tools/call'
$mcpHeaders['Mcp-Name'] = 'get_context_pack'
$packBody = @{
    jsonrpc = '2.0'; id = 2; method = 'tools/call'
    params = @{
        _meta = $mcpMeta
        name = 'get_context_pack'
        arguments = @{
            intentToken = 'representation-gap'; lang = 'fr'; version = '0.1.0'
        }
    }
} | ConvertTo-Json -Depth 10
$reply = Invoke-RestMethod -Uri $mcpUri -Method Post -ContentType 'application/json' `
    -Headers $mcpHeaders -Body $packBody
if ($reply.error -or $reply.result.isError) { throw 'MCP read rejected' }
$envelope = $reply.result.content[0].text | ConvertFrom-Json
$bytes = [Convert]::FromBase64String($envelope.contentBase64)
$observedDigest = 'sha-256:' + [Convert]::ToHexString(
    [Security.Cryptography.SHA256]::HashData($bytes)
).ToLowerInvariant()
if ($observedDigest -ne $envelope.artifactDigest) { throw 'Digest mismatch' }
```

PowerShell 7 is required for this example. The final comparison checks only the transported bytes against their declared digest. It does not replace snapshot verification under a pinned root. No model answer is generated.

The eight tools are `list_intents`, `get_intent`, `list_context_packs`, `get_context_pack`, `get_pack_manifest`, `get_attested_unit`, `verify_unit_digest` and `verify_pack_digest`. Arguments are closed: declared identifiers, FR/EN languages, registered versions and digests. No prompt or arbitrary URL is expected. Requests are limited to 16 KiB; browser calls are limited to the authorized site and Runtime origins.

## Understand the states and evidence

- **Available Runtime**: observed technical responses establish an accessible service at a specified time.
- **Consistent transport**: the published check compares REST and MCP bytes for one specific pack. It does not qualify every client usage.
- **Verified context**: complete verification requires a snapshot and its archives under the consumer’s local policy.
- **Faithful answer**: evaluating this requires a separate experiment. Model experiments remain `NOT_RUN` to date.

In `/v0/health`, `mcpEnabled: false` concerns the resolver Worker only. `externalAdapters.mcp` identifies the separate adapter; its availability is checked at `/mcp`. `sourceCommitVerified: false` means the declared commit is not an independent deployment attestation.

The [synthetic projection](../../evidence/publication.json) remains an exercise in interpreting measurement states. It is not a statistic for the hosted service. The dated real observation is kept separately, without aggregating those populations.

## Verify an individual unit before use

The raw v0 unit response is not a self-contained verified context. `X-Corpus-Root-Digest` accompanies its HTTP response and is exposed to browser JavaScript; a tool that forwards only the JSON body loses that header. MCP carries the root in its transport envelope. Neither location proves membership by itself.

The [consumer example](../../spec/examples/verified-unit.mjs) accepts a unit body, a complete snapshot, its archives and a root supplied separately by local policy. It verifies the snapshot, compares the **entire unit record** with the verified inventory, and returns the selected source value together with the verification scope. Its coverage fields come from the recipe archived inside that snapshot. The historical envelope digest covers only `requiredFieldsInPreimage`; all other record fields are listed as outside that digest. In particular, the selected value and its type and transformation arrays require the complete snapshot verification.

```javascript
import {inspectVerifiedUnit} from './spec/examples/verified-unit.mjs';
const inspected = await inspectVerifiedUnit({
  snapshotBytes,       // complete captured snapshot bytes
  unitBytes,           // REST body or decoded MCP contentBase64
  expectedRoot,        // independently selected by local policy
  getArchive,          // uri => captured archive bytes; no implicit network
  expectedIntents,     // optional independently maintained catalogue
});
// Pass inspected.unit, inspected.selectedValue AND inspected.verification together.
```

The explicit retrieval path is `/v0/snapshots/` followed by the 64 hexadecimal characters of the separately pinned root. Fetch the archive URIs listed in that snapshot. The example performs no network request and no signature or permission decision. Its output establishes consistency with the chosen root, not production-key authenticity, currentness, authority or permission to execute instructions. The [counter-tests](../../spec/examples/test-verified-unit.mjs) reject a changed unit even when the historical digest is unchanged.

## Read lifecycle and discovery precisely

Start at the Runtime index, follow `entrypoints.health`, then `externalAdapters.mcp.endpoint` in the health response. `server/discover` and `tools/list` establish the supported protocol and tools; retrieving an artifact is a separate availability check. The REST OpenAPI describes the resolver, not the separate MCP transport.

`/v0/lifecycle` currently lists available snapshot roots with current/archive status and an empty event list. That inventory is not a chronology of production deployments. Its digest ordering supplies no historical publication dates, automatic update policy or persistent rollback protection. `signatureTrust: test-only` remains an explicit limit; the hosted instance is not presented as authenticated end to end by a production signing key.

[Doctrine and context on gautierdorval.com](https://gautierdorval.com/en/doctrine/governed-context-runtime/) · [Reference guide](README.md) · [Français](../fr/instance.md)
