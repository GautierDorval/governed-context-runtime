# Local MCP Apps companion

[Français](../fr/mcp-apps.md) · [Dated qualification](../../records/mcp-apps-2026-10-26.md)

This optional example lets a person select and inspect a **whole fictional pack**, then explicitly supply its complete text projection to a conversational host. The available intent is `representation-gap`, version `semantic-boundaries-1`, in French or English. It is a local prototype, not a deployed product or a compatibility claim for every MCP client. The hosted Runtime adapter is separate.

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
| Supply context | Explicit `ui/update-model-context` request. The complete projection includes conditions, exclusions and archived source text. |
| Host acknowledgement | UI reports acceptance for subsequent turns. This is not proof of actual model use. |
| Ask for explanation | A separate explicit `ui/message` request. The person observes the answer in the conversation; the component cannot inspect that answer. |
| Text fallback | `read_gcr_pack` sends the complete selected projection directly in model-visible text. It requires a user's request to supply that context. |

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

Restart Desktop or reload its MCP configuration. Ask it to call only `open_gcr_selector`, without other tools. Inspect a language, use **Supply this context**, then **Ask for an explanation**. Read the state after every step and compare the answer with the visible exclusions. This fictional example has no need for filesystem access, a remote tunnel, credentials, OAuth or `ui.domain`. Remove the test server entry when finished and reload the configuration.

If no component renders, the catalog is not proof that the UI worked. The text fallback is a different path: explicitly request `read_gcr_pack` using the four selection fields from the catalog, without its display label. See the dated qualification for the actual client and observed result.

## Scope and primary references

GCR structures and verifies context; MCP transports calls and resources; MCP Apps adds a host-rendered UI; WebMCP exposes tools from browser pages. None of these alone establishes source truth, permission or faithful answers. The existing four-condition comparative pilot remains **NOT_RUN**. This client exercise is not that pilot, a business validation or a visibility experiment.

Sources checked on 2026-10-26: [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [App API](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html#updatemodelcontext), [Claude local setup](https://claude.com/docs/connectors/building/mcp-apps/getting-started), [Claude troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting), [ext-apps 2.0.3 licence](https://github.com/modelcontextprotocol/ext-apps/blob/v2.0.3/LICENSE). The local server negotiates the protocol supported by its pinned SDK; it does not silently translate the hosted adapter's 2026-07-28 profile.
