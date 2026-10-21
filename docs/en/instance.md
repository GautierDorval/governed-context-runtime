# Use the gautierdorval.com instance

An assistant may need to explain a doctrine without confusing it with a product or permission to act. The Runtime supplies a prepared context: a declared intent, language, version, sources and interpretation boundaries. The integrator can inspect that set before passing it to the assistant.

The instance is available at **[context.gautierdorval.com](https://context.gautierdorval.com/)**. It serves the same artifacts over HTTP and through a separate MCP adapter. This repository provides reference contracts and verifiers; the hosted service and its corpus have their own publication lifecycle.

## Observed status

The latest dated producer record in this edition is the [October 19, 2026 observation](../../evidence/instance-2026-10-19.json). It records 564 root-file responses, six MCP exchanges with five direct Runtime comparisons, and a separate GET/HEAD smoke over 156 indexed resources. These checks passed after the coordinated service deployment. They do not establish continuous availability. The October 12 and 14 records below are historical.

### Historical check, October 12

On **October 12, 2026 at 02:18 UTC**, a producer technical check confirmed HTTP responses, discovery of eight MCP tools and exact equality of the French `representation-gap` pack received through both transports. The observed registry contains six intents and twelve FR/EN packs. The versions are distinguished in the table below.

[Dated observation and response digests](../../evidence/instance-2026-10-12.json) · [Evidence scope](../../evidence/README.md)

This observation establishes the described behaviour at that time, without guaranteeing future availability. These checks are producer-initiated technical traffic, with no model invocation. They do not measure adoption or the effect of context on an answer.

## Versions and identifiers

Each identifier names a different thing; matching numbers carry no meaning across rows.

| Identifier | What it names |
|---|---|
| `0.2.1-proposed` candidate | Current reference verifier and documentation; cite the exact executed commit. P3 narrows archive acceptance. Historical schemas, recipes and example bytes remain unchanged; the old tag is preserved. |
| `runtimeVersion` `0.3.0-proposed` | The software of the hosted Runtime. |
| `schemaVersion` | Object-specific: historical snapshot/archive profiles remain `0.1.0-proposed`; `0.2.0` was read only on the retained `GovernedContextRuntimeHealth` asset in the [local qualification](qualification.md). |
| MCP revision `2026-07-28` | The protocol profile served by the MCP adapter. |
| `corpusVersion` | A family label. Successive snapshots of the same corpus line keep the same label, so it does not identify content. |
| Corpus root `sha-256:…` | One exact snapshot. It is the only identifier of corpus content. |
| Pack `version` | The version of one pack within a snapshot, for example `0.1.0`; the same pack version can appear under several roots. |
| `publicationId` in `evidence/publication.json` | The synthetic public projection. It is not a corpus root. |

The observation of October 12, 2026 recorded the root `sha-256:367be59f…`, given in full in the evidence file. `/v0/lifecycle` lists the roots available now; it does not say when each one was served. A release tag of this repository identifies repository content: it neither contains nor signs a production corpus root, and the demo keys are test keys.

The historical [October 14 deployment observation](../../evidence/instance-2026-10-14.json) records the root then current, `sha-256:d5d52ed75360d38cd1fa0e434c302d57a80ec94e9be9daaf3e8d7866fd2305e0` during the producer capture at 14:53–14:54 UTC. REST/MCP capture and root-file comparison passed. This dated technical observation does not establish future availability, production signing, adoption or model fidelity; the October 12 receipt remains historical evidence.

The [October 19 observation](../../evidence/instance-2026-10-19.json) records the current root `sha-256:beaeed142e9b3898734414eeebf7ab6283ef57dbd7c2af53479405395e5a4fe4` during the final application capture from 14:11:55 to 14:12:13 UTC. The current French and English `interpretive-governance-overview` packs use version `0.1.1`; the separately checked English `0.1.0` pack retains its historical root. Pack versions are selected per intent: the `representation-gap` examples below explicitly pin version `0.1.0`.

The index still exposes `status: stable`; this field does not qualify the interface or signing profile. Read the separate `maturity` fields: interface and attestation recipes are proposed, signing is test-only and scientific evaluation is not run. In `/v0/health`, `mcpEnabled: false` is scoped to `this-resolver-worker-only`. The separately hosted adapter is identified under `externalAdapters.mcp`; its availability must be checked at that endpoint. The October 19 observation includes successful MCP exchanges.

The production Worker implementation is maintained in a private repository. A deployment `sourceCommit` such as `7328776…` identifies that private source and cannot be resolved in this public reference repository. The public code here contains the reference contracts, verifiers and examples, not the production Worker implementation. In health metadata, `deployment.timestamp` is the version creation time, not the time it started receiving production traffic. `sourceCommitVerified: false` remains a limit on independently verifiable provenance.

On an immutable archive, digest-addressed snapshot or version-pinned pack, `X-Corpus-Root-Digest` can retain the root recorded when that response entered a cache. It is not a freshness signal for the current corpus. Read `/v0/snapshot` to select the current root, then verify the selected inventory and referenced resource bytes; keep historical roots distinct from current discovery.

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


## Current reader qualification and pack membership

The [October 20 offline qualification](qualification.md) covers the retained adapter with a local resolver binding: discovery and 12 current pack selections, no hosted request. JSON/SSE synthetic tests remain distinct. The modern profile requires `resultType: complete`; older results without that field are not silently accepted, and `input_required` triggers no further exchange. The 1,048,576-byte and 10,000-ms reading limits do not establish hosted size or latency.

The snippet above establishes only the artifact digest declared in its envelope. `inspectVerifiedPack` does not automatically receive or bind those extracted bytes. To bind them, use `bindMcpPack(reply, {snapshotBytes, getArchive, expectedRoot, intentToken, lang, version, expectedIntents, artifactByteProfile: 'canonical-json'})` from `scripts/qualify-offline.mjs` with the complete local archives and a separately supplied root. That explicit profile matches the retained producer's canonical serving contract. It compares the original received bytes to the canonical representation and the selected `payloadDigest`. The original repository file has a separate `payloadFileDigest`; do not describe canonical-content binding as equality with that file. Use the default `repository-bytes` profile only for an actual repository-byte artifact. No profile fallback occurs.

Signature trust, permission, current deployment and model fidelity remain separate. The diagnostic dossier tracks the outstanding hosted captures; this local qualification does not replace historical client observations.

## 3. Read the same pack through MCP

The adapter is described at `POST https://context.gautierdorval.com/mcp`, with revision **`2026-07-28`**, `server/discover` and the per-request metadata below. The [official transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) requires both JSON and SSE in `Accept`. The [shared reader](../../spec/examples/read-mcp-response.mjs) then selects decoding from the received `Content-Type`. Its function accepts an injected response and performs no network request.

Run the following from the repository root with PowerShell 7 and Node.js 24.17.0 or newer. **Its explicit `fetch` calls the hosted service**; repository tests do not execute those calls. Redirects are refused. For a fully offline exercise, run `node --test test/mcp-response.test.mjs`. Correcting this guide is not a new production observation. The October 14 MCP row describes the earlier snippet checked by the producer; it does not qualify this new JSON/SSE reader. Earlier observations remain under [Tested clients](#tested-clients).

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
    'Accept' = 'application/json, text/event-stream'
    'Content-Type' = 'application/json'
    'MCP-Protocol-Version' = $mcpVersion
}
$discoveryBody = @{
    jsonrpc = '2.0'; id = 1; method = 'server/discover'
    params = @{ _meta = $mcpMeta }
} | ConvertTo-Json -Depth 10 -Compress
$packBody = @{
    jsonrpc = '2.0'; id = 2; method = 'tools/call'
    params = @{
        _meta = $mcpMeta
        name = 'get_context_pack'
        arguments = @{
            intentToken = 'representation-gap'; lang = 'fr'; version = '0.1.0'
        }
    }
} | ConvertTo-Json -Depth 10 -Compress
$readerScript = @'
import {createHash} from 'node:crypto';
import {readMcpResponse, extractMcpArtifact} from './spec/examples/read-mcp-response.mjs';
const [uri, headerJson, ...bodies] = process.argv.slice(2);
for (const body of bodies) {
  const request = JSON.parse(body);
  const headers = {...JSON.parse(headerJson), 'Mcp-Method': request.method};
  if (request.method === 'tools/call') headers['Mcp-Name'] = request.params.name;
  const response = await fetch(uri, {
    method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(10_000),
  });
  const reply = await readMcpResponse(response, {requestId: request.id});
  if (reply.kind === 'rpc-error') throw new Error('jsonrpc_error: ' + JSON.stringify(reply.message.error));
  if (request.method !== 'tools/call') continue;
  const extracted = extractMcpArtifact(reply);
  if (extracted.status !== 'artifact') throw new Error('mcp_result: ' + extracted.status);
  const observedDigest = 'sha-256:' + createHash('sha256').update(extracted.artifactBytes).digest('hex');
  if (observedDigest !== extracted.envelope.artifactDigest) throw new Error('artifact_digest_mismatch');
  console.log({observedDigest, byteLength: extracted.artifactBytes.length, snapshotVerified: false});
}
'@
$readerScript | node --input-type=module - $mcpUri ($mcpHeaders | ConvertTo-Json -Compress) $discoveryBody $packBody
```

The reader limits each body to **1,048,576 bytes** (`maxBytes`) and its reading to **10,000 ms** (`timeoutMs`). These configurable values accommodate the suite's small fictional responses; they do not qualify the size of every hosted archive. The response ceiling is separate from the 16 KiB request limit. The example's `fetch` also limits connection, headers and body together to ten seconds.

Complete SSE events follow the [SSE grammar](https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream): comments are ignored, CR/LF/CRLF line endings work, `data:` lines are joined and UTF-8 decoding spans chunk boundaries. This example refuses invalid UTF-8 and named events other than `message`. It stops at the terminal response, cancels reading and never reconnects. EOF without a complete response, a different identifier (including its type), an unknown media type or an exceeded limit produces a diagnostic.

A JSON-RPC error remains `rpc-error`, including under HTTP 200. A [tool result](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) with `isError: true` remains `tool-error`. Extraction requires `resultType: complete` and a single text block containing the Runtime envelope; results needing another step, unknown types and resource links yield no usable artifact. No returned link is followed. This finite reader is not a universal MCP SDK: version negotiation, older `initialize`, sessions, subscriptions and additional exchanges are out of scope.

The transport envelope is ordinary JSON, without the Runtime artifacts' numeric profile. `contentText` retains the received text and `artifactBytes` retains the decoded `contentBase64` bytes, including BOM, spaces and line endings. The comparison above checks only their declared digest. Keep those bytes unchanged and bind them to the selected entry using the explicit profile above, after complete snapshot verification under a separately supplied root. No model answer is generated.

The eight historically recorded tools are `list_intents`, `get_intent`, `list_context_packs`, `get_context_pack`, `get_pack_manifest`, `get_attested_unit`, `verify_unit_digest` and `verify_pack_digest`. Their arguments are closed: declared identifiers, FR/EN languages, registered versions and digests. No prompt or arbitrary URL is expected. Requests are limited to 16 KiB; browser calls are limited to the authorized site and Runtime origins.

## Tested clients

Results of **October 14, 2026**, on loopback services: the resolver and the MCP adapter of the privately maintained production Runtime implementation ran under workerd (`wrangler dev`) and served the corpus root `sha-256:acf7bc39…`. They show that these clients work with the served contract. They are not observations of the hosted instance, which the dated evidence above covers. Apart from the guide snippets, the clients below are producer checks that are not part of this repository.

| Client type | Client and version | Transport and revision | Steps executed | Result |
|---|---|---|---|---|
| HTTP script | PowerShell 7.6.6 `Invoke-RestMethod`, snippet of section 1 (EN and FR guides) | REST | Registry, French pack and manifest | Passed |
| HTTP script | PowerShell 7.6.6, historical MCP snippet captured on October 14 (replaced in section 3) | POST JSON-RPC, `2026-07-28` | `server/discover`, `tools/call get_context_pack`, base64 decoding, digest comparison | Passed |
| HTTP checks | Node.js 24.17.0 and Python 3.14.6 | REST | 1,781 checks each: snapshot, archives, packs, manifests, digests | Passed |
| MCP SDK | `@modelcontextprotocol/client` 2.3.1 on Node.js 24.17.0 | Streamable HTTP, revision pinned to `2026-07-28` | Resource discovery and reading, complete snapshot verification, `tools/call`, historical resources | Passed |
| Independent MCP client | Python 3.14.6 standard library | POST JSON-RPC, `2026-07-28` | Same steps, written separately | Passed |
| Older exchange | `initialize` request of revision `2025-06-18` | POST JSON-RPC | One request | Refused as documented: HTTP 404, JSON-RPC `-32601` |
| Business error | `tools/call` with an undeclared intent | POST JSON-RPC, `2026-07-28` | One request | Tool result with `isError: true` and the list of declared intents |
| Agentic applications | Claude Code, Codex CLI, Cursor and other assistants | Not applicable | None | Not tested: each needs its own configuration against the hosted endpoint, which this pass did not perform |

The MCP SDK and the independent Python client reached the adapter through a loopback host, with the resolver under workerd. A client that requires the `initialize` exchange is unsuitable for this profile; that says nothing about the conformance of either side to its own revision. An adapter for earlier revisions is deferred: it would be a separate functional change, not a guide correction.

## Understand the states and evidence

- **Available Runtime**: observed technical responses establish an accessible service at a specified time.
- **Consistent transport**: the published check compares REST and MCP bytes for one specific pack. It does not qualify every client usage.
- **Verified context**: complete verification requires a snapshot and its archives under the consumer’s local policy.
- **Faithful answer**: evaluating this requires a separate experiment. Model experiments remain `NOT_RUN` to date.

In `/v0/health`, `mcpEnabled: false` concerns the resolver Worker only. `externalAdapters.mcp` identifies the separate adapter; its availability is checked at `/mcp`. `sourceCommitVerified: false` means the declared commit is not an independent deployment attestation.

The [synthetic projection](../../evidence/publication.json) remains an exercise in interpreting measurement states. It is not a statistic for the hosted service. The dated real observation is kept separately, without aggregating those populations.

## Verify an individual unit before use

The raw v0 unit response is not a self-contained verified context. `X-Corpus-Root-Digest` accompanies its HTTP response and is exposed to browser JavaScript; a tool that forwards only the JSON body loses that header. MCP carries the root in its transport envelope. Neither location proves membership by itself.

The [consumer example](../../spec/examples/verified-unit.mjs) accepts a unit body, a complete snapshot, its archives and a root supplied separately by local policy. It verifies the snapshot, compares the **entire unit record** with the verified inventory, and returns the selected source value together with the verification scope. Coverage comes from the immutable field definition used by the executed v0 preimage algorithm. If archived `requiredFieldsInPreimage` metadata is present, it must describe exactly those seven fields; absence of that optional metadata does not remove their coverage. Contradictory declarations are refused. Selected-value profiles cover no record field directly. In particular, the selected value and its type and transformation arrays require the complete snapshot verification.

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

[Offline complete-pack kit](reproduction.md) · [Pack semantics](pack-semantics.md)

[Doctrine and context on gautierdorval.com](https://gautierdorval.com/en/doctrine/governed-context-runtime/) · [Reference guide](README.md) · [Français](../fr/instance.md)
