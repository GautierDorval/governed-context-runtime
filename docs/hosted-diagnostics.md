# Hosted diagnostic dossier

Status: **NOT_RUN** for hosted behavior and for replay against the production adapter. This dossier defines the missing evidence and isolated cases; it does not diagnose the current service. No owner-service request, private implementation access or simulated production server is part of this work.

## Available evidence and limits

The [October 12, 14 and 19 summaries](../evidence/README.md) provide dated producer statements, hashes, counts and scopes. They do not publish the response bodies or a complete lifecycle/discovery transcript. The [historical client table](en/instance.md#tested-clients) records one loopback `initialize` request labelled `2025-06-18`, with HTTP 404 and JSON-RPC `-32601`. Its complete headers and body are not published. Keep that result as recorded; do not replace it with the normative outcome of a newly constructed request.

The public package does not contain the hosted adapter implementation. The shapes needed for a faithful lifecycle response comparator are not available as raw local captures. Therefore this dossier does not invent a lifecycle wire schema, create a fake service, or present test fixtures as a reproduction of production behavior. The [observation tests](observations.md) validate summaries only.

## Isolated MCP request cases

Assumed profile for the following planned cases: a modern-only adapter using MCP `2026-07-28`, a known accepted version and a known available MCP endpoint. The endpoint must be supplied by a separately authorized diagnostic mandate; this dossier supplies no executable sender. Every case uses HTTP `POST`, independent request state, no redirect, no retry, and a distinct JSON-RPC identifier. Actual response, response headers and capture timestamps: **NOT_RUN / not available** for every case.

The common local request template is:

```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "server/discover"
  },
  "body": {
    "jsonrpc": "2.0",
    "id": "diagnostic-control",
    "method": "server/discover",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": {
          "name": "local-diagnostic-case",
          "version": "1.0.0"
        },
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  }
}
```

Each row starts with a fresh copy of that template. Set `body.id` to the case ID and apply only its listed change. Never use a prior failure as a different case's baseline.

| Case ID | Single isolated change | Expected result under the assumed modern profile | Actual result |
|---|---|---|---|
| `missing-method-header` | Remove `headers.Mcp-Method`; keep body and version consistent. | HTTP 400, JSON-RPC `-32020`. | NOT_RUN |
| `mismatched-method-header` | Set only `headers.Mcp-Method` to `tools/list`; body remains `server/discover`. | HTTP 400, JSON-RPC `-32020`. | NOT_RUN |
| `unsupported-version` | Change both protocol-version locations to `1900-01-01`, after confirming this version is unsupported by the implementation under test. This changes one logical condition while avoiding header/body mismatch. | HTTP 400, JSON-RPC `-32022`, `error.data.requested` and `error.data.supported`. | NOT_RUN |
| `unknown-method` | Change both method locations to `initialize`; keep the accepted modern version and per-request metadata. Confirm the modern-only profile does not implement this method. | HTTP 404, JSON-RPC `-32601`. | NOT_RUN |

The transport distinguishes header failure, unsupported version and an unknown method. These expectations are conditional on the stated isolated inputs; the word `initialize` alone does not select a row. [MCP Streamable HTTP, revision 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

The unsupported-version response includes its requested version and supported-version list. [MCP message/error schema](https://modelcontextprotocol.io/specification/2026-07-28/schema#unsupportedprotocolversionerror).

For any `initialize` rejection by a modern-only server, also record whether the supported versions are named. This is a **SHOULD** recommendation, separate from the applicable **MUST** requirements for a particular malformed-header or unsupported-version case. Missing version information alone must not be reported as violation of a MUST. [MCP versioning and compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning#backward-compatibility-with-initialization-based-versions).

## Lifecycle comparison cases

All cases below remain **NOT_RUN**. They describe the desired comparison once the exact response schemas and captures exist; they are not claims about the hosted implementation.

| Case | Required captured condition | Bounded expected diagnostic |
|---|---|---|
| Coherent current discovery | Discovery root and exactly one lifecycle current entry agree in a stable deployment window. | Current discovery is consistent with that captured inventory. |
| Missing current root | Discovery root is absent from the captured lifecycle inventory. | Inconsistency in these captures, subject to transition checks. |
| Several current entries | More than one distinct entry declares current status. | Ambiguous current declaration; preserve all entries. |
| Preserved historical root | A versioned immutable artifact has a different root retained in lifecycle. | Historical identity is preserved; difference alone is not an error. |
| Deployment transition | Discovery/lifecycle captures straddle an observed deployment transition or their ordering cannot establish stability. | INCONCLUSIVE; no inferred steady-state defect or cache cause. |

A current discovery response and the root header of an immutable historical resource answer different questions. Cache headers are observations, not enough evidence to assign a cause or reconstruct propagation duration.

## Evidence needed before a reproducible diagnostic

For each isolated case or lifecycle sequence, a future authorized run must retain:

1. Exact endpoint/surface and path, HTTP method, full relevant request headers, request body bytes and protocol profile; redact credentials before publication without replacing needed protocol metadata.
2. Status, response headers, response body bytes, content type, byte length and digest; distinguish the raw response from a derived summary and record which material is actually publishable.
3. UTC start/end and per-exchange timestamps, sequence order, client/version, workstation/network scope and capture clock limitations.
4. Exact adapter candidate/revision, locally available code and its configuration for any implementation replay; deployment state and transitions covering the capture window for a hosted interpretation.
5. Explicit relation between current discovery, `/v0/lifecycle`, current snapshot and each immutable historical resource. Include actual response shapes rather than reconstructing bodies from their hashes.
6. Intended expected result, actual result, unsupported-version list when applicable, diagnostic and uncertainty for each case. Keep a source declaration distinct from independently verified deployment provenance.

With these inputs, a later mandate can implement a pure comparator against the real local shapes and replay known exchanges. It must distinguish local synthetic controls, local implementation replay and hosted observations. The missing data leaves the two reports unresolved; it neither proves nor disproves the hosted service's conformance, availability or value.

[Observation contracts](observations.md) · [Evidence lineage](../evidence/README.md)
