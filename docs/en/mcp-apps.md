# Local MCP Apps companion

[Français](../fr/mcp-apps.md) · [Dated qualification](../../records/mcp-apps-2026-10-26.md)

This optional example lets a person select and inspect a **whole fictional pack**, then explicitly supply its complete text projection to a conversational host. The available intent is `representation-gap`, version `semantic-boundaries-1`, in French or English. It is a local prototype, not a deployed product or a compatibility claim for every MCP client. The hosted Runtime adapter is separate.

**Complete T3 journey, October 27, 2026: successful local French qualification.** In Windows Claude Desktop 3.6556.2.0, displayed model Opus 5.5 Max, **Have the assistant read this pack** prepared the exact request after inspection. Sending it led to one `read_gcr_pack` call, the complete 57,236-byte UTF-8 projection and an answer exactly reproducing all 11 entries across the five requested lists. Pack identity, handling of missing or conflicting evidence, and the absence of permission for booking, payment or work were preserved. The [T3 record](../../records/mcp-apps-2026-10-26.md#selector-to-answer-qualification-t3-2026-10-27) identifies the candidate, build and evidence.

T3 retried within the same private conversation after the T2 cancellation, whose cause remains unknown. T2 produced no effective text-tool call; a new inspection, one click and one send led to the only observed read across T2/T3. This result covers this fictional French pack and configuration. It does not measure consistent first-attempt success. The interface and pack also exist in English, but no real English trial ran in this session. The separate successful [direct text trial T1](../../records/mcp-apps-2026-10-26.md#text-tool-qualification-t1-2026-10-27) used a directly entered question.

The button uses text-message capability independently of context-update capability. An acknowledgement only means the host accepted the request; it does not establish tool execution or an answer. The component does not read the conversation: `toolReadObserved: false` remains its correct state. The observer established the T3 call and answer.

**Experimental native channel: still unqualified.** Earlier trials, the October 26 blockage before submission and the October 27 A/B and H1 diagnostics remain separate observations. A/B answered `NON_DISPONIBLE` under an instruction forbidding tools. H1 explicitly allowed the internal widget reader and received the same answer; its effective invocation was not observed. The internal cause remains unknown. T3 exercised neither `updateModelContext` nor the nonce diagnostic. The [dated history](../../records/mcp-apps-2026-10-26.md) retains these results without treating them as general proof of context non-delivery.

## Architecture and trust

The source lives in [spec/examples/mcp-apps](../../spec/examples/mcp-apps/README.md). Its preparer materializes six unmodified reference files from Git commit `57a09f1830ed20864ec66a6d153fc230b0331865`, verifies their SHA-256 digests and keeps the installed application **outside the reference checkout**. It does not copy or fork the verifier's implementation into maintained companion code. The root package, dependency policy, historical kit and contracts are unchanged.

Each inspection reuses `inspectVerifiedPack` against the complete snapshot and archived records. The expected corpus root comes from the separately pinned educational anchor, not from the selected pack's self-declaration. Both languages belong to that same corpus root; each selection still has its own pack identity and language. The root is an integrity anchor for a fictional example, not authenticated business authority. Signature trust is not established and use permission is not evaluated.

The component displays conditions, exclusions, required evidence, forbidden inferences, the complete declared pack, units, manifest and archived sources. Original pack and manifest bytes remain available as base64. Display formatting and the submitted text projection are not described as the original verified bytes. Archived source text is present locally; declared URLs are labels and are never fetched.

## What reaches whom

| Operation | Data and meaning |
| --- | --- |
| Open selector | Catalog only. No complete pack is automatically added to model context. |
| Select language | Invalidates previous preview and acceptance for the current selection. Prior conversation history cannot be withdrawn. |
| Inspect | Full verification; detailed preview and complete projected text in result `_meta`, readable by the host and component. Identity and root also appear in the tool text. Metadata is not secret. |
| Submit through the experimental native channel | Explicit `ui/update-model-context` request. The complete projection includes conditions, exclusions and archived source text. |
| Host acknowledgement | UI reports acceptance for subsequent turns. This is not proof of actual model use. |
| Ask for explanation | A separate explicit `ui/message` request. The person observes the answer in the conversation; the component cannot inspect that answer. |
| Have the assistant read this pack | Prepares a `ui/message` request containing only the four inspected selection fields. The assistant, not the component, must invoke the text tool. The host may require manual sending of the draft. |
| Read through the text tool | `read_gcr_pack` sends the complete selected projection directly in model-visible text. It requires a user's request to supply that context. |

Read requests are blocked before inspection, while diagnostics are enabled, and after a request until reinspection. Selection changes and disconnection invalidate their state; a late acknowledgement cannot certify the current selection. Check the conversation before retrying an unconfirmed request: the host may have received it. The in-flight request lock survives programmatic selection invalidation. It blocks another request, native submission and diagnostics until the request settles. Reload never replays a request. Without text-message capability, a direct manually entered tool request remains a separate path.

No complete pack is placed in `structuredContent`. Errors invalidate usable context. Late previews and acknowledgements cannot validate a different selection. A missing acknowledgement, timeout or refusal remains **unconfirmed**, because the host might have received the request. The server refuses an oversized projection instead of truncating it. The component makes no network fetch, navigates no source URL and grants no permission for business action.

## Reproduce locally

Use Node.js 24.17.0 or newer and a Git checkout containing the pinned commit. From the reference repository in PowerShell:

```powershell
$companionDir = Join-Path $env:TEMP ("gcr-mcp-apps-" + [guid]::NewGuid())
node .\spec\examples\mcp-apps\prepare.mjs $companionDir
Push-Location $companionDir
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
Pop-Location
```

Do not run `npm install` in the companion source directory inside the reference checkout. Dependencies and the lockfile are isolated: ext-apps 2.0.3, MCP client/server 2.0.0, Zod 4.6.7 and esbuild 0.28.2. The build embeds the installed packages' actual licence and notice texts. In particular, the ext-apps tag's transitional licence text is more precise than its package metadata; retain the shipped notices.

The browser harness is optional and uses an already installed Puppeteer module; it downloads no browser:

```powershell
node "$companionDir\test\browser.mjs" --puppeteer "C:\path\to\puppeteer\lib\puppeteer\puppeteer.js" --output (Join-Path $env:TEMP "gcr-visual")
```

This harness uses a real stdio server and the official AppBridge in a **simulated host without a model**. Its success does not establish client compatibility. Inspect the generated mobile screenshots as well as `results.json`.

## Try in Claude Desktop

Merge one entry into `mcpServers` in the configuration file exposed by Settings > Developer > Edit Config, preserving every existing setting. The following PowerShell prints the entry with the actual paths:

```powershell
@{mcpServers=@{'gcr-fictional-context'=@{
  command=(Get-Command node).Source
  args=@((Join-Path $companionDir 'server.mjs'))
}}} | ConvertTo-Json -Depth 5
```

Restart Desktop or reload its MCP configuration. Ask it to call only `open_gcr_selector`, without other tools. Inspect a language, use **Have the assistant read this pack**, then confirm sending in the conversation if the host prepares a draft. The experimental native channel separately retains **Submit through the native channel** and **Ask for an explanation**. Read the state after every step and compare the answer with the visible exclusions. This fictional example has no need for filesystem access, a remote tunnel, credentials, OAuth or `ui.domain`. Remove the test server entry when finished and reload the configuration.

If no component renders, the catalog is not proof that the UI worked. The text fallback is a different path: explicitly request `read_gcr_pack` using the four selection fields from the catalog, without its display label. See the dated qualification for the actual client and observed result.

## Scope and primary references

GCR structures and verifies context; MCP transports calls and resources; MCP Apps adds a host-rendered UI; WebMCP exposes tools from browser pages. None of these alone establishes source truth, permission or faithful answers. The existing four-condition comparative pilot remains **NOT_RUN**. This client exercise is not that pilot, a business validation or a visibility experiment.

Sources checked on 2026-10-26: [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [App API](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html#updatemodelcontext), [Claude local setup](https://claude.com/docs/connectors/building/mcp-apps/getting-started), [Claude troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting), [ext-apps 2.0.3 licence](https://github.com/modelcontextprotocol/ext-apps/blob/v2.0.3/LICENSE). The local server negotiates the protocol supported by its pinned SDK; it does not silently translate the hosted adapter's 2026-07-28 profile.

## Optional nonce diagnostic

Diagnostics are off by default. Open **Optional diagnostic** and enable it explicitly. **Short** supplies only a 140-byte UTF-8 envelope, with no pack. **Full** requires inspection of the current selection and appends the entire unchanged projection. Both modes place the envelope first, ending with two newline characters. It is not verified GCR data. The existing local limit is 200,000 UTF-8 bytes including the envelope, with no truncation; this is not an established host limit.

Each explicit submission draws 16 cryptographic browser bytes encoded as 32 hexadecimal characters for `gcrDiagnosticNonce`, with an independent trial identifier. Missing `crypto.getRandomValues` or Web Crypto SHA-256 refuses the trial; there is no `Math.random` fallback. The SDK remains pinned at 2.0.3.

| Channel | Diagnostic data |
| --- | --- |
| `updateModelContext` | Intended model input; attribution requires isolating all observer channels, including the SDK console. Exactly one call per explicit submission. |
| Catalogue, inspection, `_meta`, `structuredContent`, `read_gcr_pack` fallback | No nonce; inspection precedes generation. `_meta` is not secret. |
| `ui/message` and user message | Request for the named field, never its expected value. A prepared draft may require manual sending. |
| Observer trace | Exact payload, digest, UTF-8 size, expected value and chronology in memory and, when available, component `sessionStorage`. Never automatically displayed or sent. |
| Component console and host debug logs | The ext-apps 2.0.3 transport logs the complete outgoing message with `console.debug`, including the nonce. Keep this observer-only channel outside the tools, files, screenshots and logs available to the tested model. |

Session storage retains at most four trials and is not a security boundary against the host. A storage refusal is displayed; reload may then lose the evidence. An observer must retain it separately or mark the result indeterminate. Never give the tested model access to this trace. Revealing it requires explicit confirmation that evaluation and any reload variant are complete. Premature disclosure contaminates the trial. Keep the nonce out of screenshots, clipboard, messages and files accessible to that model. The component cannot read the answer or claim verified reproduction. Reconnection and reload never submit context or restore an old acknowledgement as usable state.

### Bounded real-client procedure

1. Explicitly exclude tested-model access to the component console, Desktop logs and observer trace. If this separation cannot be established, do not claim an isolated channel; record the limitation and any contamination. Identify the source commit, client/version/OS, capabilities, `app.html` SHA-256 and actual served `ui://gcr/pack-selector-<digest>.html` URI. Wait for each preceding turn to finish.
2. **A, once**: fresh conversation, short mode, explicit submission and acknowledgement, then request the nonce. Confirm the draft was actually sent. Record the answer without another tool call.
3. **B, once**: another fresh conversation, full mode, inspected French pack, fresh nonce and the same sequence.
4. **C, at most once after A or B fails**: prefer B if both fail. Retain traces, then reload that same conversation. Do not submit anything. Request the previous field in an ordinary message without its value. If no-new-update cannot be established, mark possible reinjection as a confound. Lost expected values prevent exact comparison.
5. **D, conditional on general failure**: another fresh conversation, different nonce supplied directly in an ordinary user message. This copying control is outside MCP Apps.
6. Finish or exclude C before revealing observer evidence. Retain the actual payload, not just a hash, and never reuse historical nonces. Do not repeat an interpretable negative result; a retry requires a specific documented invalidation.

English prompt: “Copy the value of the gcrDiagnosticNonce field supplied by the component. If this value is not available in your context, answer NON_DISPONIBLE. Do not call any tool to find it. Answer with the value alone, without explanation.” The French UI provides the equivalent instruction used for the bounded campaign.

Record exact value reproduction separately from formatting, tool calls and timestamped events. A correct value with extra prose establishes availability but fails the requested format. A missing or incorrect value does not prove non-injection. Isolated success establishes neither the entire projection’s presence, faithful use nor general compatibility. A positive A and negative B do not isolate size from content. See the [dated record, initial-publication closure and new diagnostic](../../records/mcp-apps-2026-10-26.md).

The [pinned API source](https://github.com/modelcontextprotocol/ext-apps/blob/v2.0.3/src/app.ts) describes availability to subsequent turns and replacement of the previous contribution. Resolution is an acknowledgement, not telemetry of the input used. Tool-result limits in Claude troubleshooting do not establish limits for this method.

Dependency advisory check, 2026-10-26: `npm audit` reports two packages with high advisories in the existing MCP client/server 2.0.0 lockfile (HTTP/OAuth scenarios). This companion uses only stdio, local fictional data and no OAuth. No upgrade or HTTP extension is included; reassess these advisories before changing transport or scope.
