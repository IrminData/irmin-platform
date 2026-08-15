# Irmin MCP server

This package contains a Model Context Protocol (MCP) server implemented in Go
using the official `go-sdk`. The MCP server provides AI models with programmatic
access to Irmin’s data warehouse functionality.

You can test the server with the MCP Inspector or via the single-step HTTP
attach endpoint.

## Features

- One canonical `ToolDescriptor` registry for MCP, AI Application execution,
  prompt documentation, Console metadata, and workspace catalogs
- Strict `irmin_<domain>_<action>` schemas and structured results
- Capability and risk policy (`read`, `write`, `destructive`) independent of
  literal tool names
- Authenticated, workspace-isolated Streamable HTTP transport
- Atomic human approval for AI Application pending operations

## Endpoints

- Main server: `http://localhost:<PORT>` (env `PORT`, default in `.env`)
- MCP (full flow): `http://localhost:<PORT><MCP_HTTP_PATH>` (default `/mcp`)
  - For clients that implement the MCP streamable HTTP handshake (e.g., `mcp-remote`,
    Claude Desktop, Inspector)
- MCP attach (single-step Streamable HTTP): `http://localhost:<PORT><MCP_HTTP_PATH>/attach`
  - For HTTP-only clients that need a single `GET` request with Bearer auth (e.g., Langflow)
  - Uses the Streamable HTTP transport with automatic initialization and SSE streaming

Configure the mount path with `MCP_HTTP_PATH` (default `/mcp`).

## Authentication

The MCP server requires authentication using the `Authorization` header with a
Bearer token:

```
Authorization: Bearer <token>
```

The token can be:
- A generated profile-specific API token from Irmin
- A JWT token from Clerk authentication

System tokens are not permitted for MCP access.

Origin-bearing requests must exactly match `MCP_ALLOWED_ORIGINS`; an empty
allowlist rejects all such browser requests. Authenticated machine clients may
omit `Origin`. Forwarded IP headers are accepted only from
`MCP_TRUSTED_PROXY_CIDRS`.

## Quick start

### Test the HTTP attach endpoint (single-step Streamable HTTP)

```bash
curl -i \
  -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:<PORT>/mcp/attach
```

You should see `HTTP/1.1 200 OK` and a streaming response
`Content-Type: text/event-stream`. The Streamable HTTP handler automatically handles
initialization and establishes the SSE connection.

### Use mcp-remote (full flow, STDIO bridge)

```bash
npx -y mcp-remote@latest \
  http://localhost:<PORT>/mcp \
  --header "Authorization: Bearer <YOUR_TOKEN>"
```

If you prefer a global install:
```bash
npm i -g mcp-remote@latest
mcp-remote http://localhost:<PORT>/mcp \
  --header "Authorization: Bearer <YOUR_TOKEN>"
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Connect to your MCP endpoint:
- URL: `http://localhost:<PORT>/mcp`
- Header: `Authorization: Bearer <YOUR_TOKEN>`

### Langflow (HTTP transport)

Paste this into the HTTP MCP client config:

```json
{
  "type": "mcp",
  "transport": "http",
  "url": "https://your-host.example.com/mcp/attach",
  "headers": {
    "Authorization": "Bearer <YOUR_TOKEN>",
    "Accept": "text/event-stream",
    "Cache-Control": "no-cache"
  },
  "timeout_ms": 120000
}
```

Notes:
- Use the `/mcp/attach` endpoint for Langflow’s HTTP-only client.
- Keep exactly one space after `Bearer`.
- If you’re behind a proxy, ensure SSE isn’t buffered. We set `X-Accel-Buffering: no`
  on the response server-side.

## Development

The MCP server runs as an embedded component within the main Irmin API
application. We expose two routes:
- `<MCP_HTTP_PATH>` for the standard Streamable HTTP flow (POST for requests, GET for SSE)
- `<MCP_HTTP_PATH>/attach` for single-step Streamable HTTP attach (HTTP-only clients)
  - Proxies GET requests to the base path, allowing the SDK handler to manage initialization and SSE automatically

### Adding new tools

1. Add the handler and one `toolregistry.Descriptor` in `mcp/tools/`.
2. Register it through `toolregistry.Register`; direct SDK registration is not
   an application extension point.
3. Use strict input/output schemas, choose the risk and capability, set timeout
   and cancellation behavior, and declare audit redaction.
4. Update the deterministic catalog snapshot and tests.

AI Application destructive tools always stage a pending operation. Ordinary AI
Application writes stage only when explicit write approval is enabled. Only an
authenticated workspace user may approve or reject; AI Application credentials
cannot self-approve.

The user MCP endpoint does not yet implement generic destructive-operation
staging and replay. The AI runtime therefore withholds those descriptors from
agents, and the canonical registry rejects direct destructive calls before a
handler can run. Those tools remain unavailable until that policy path is
implemented.

### Adding new resources

1. Create a resource function in `mcp/resources/`.
2. Add it to `MCPResources.RegisterAll` in `resources.go`.
3. Preserve authenticated, read-only workspace access.

### Project structure

```
mcp/
├── ai-application.go # AI Application MCP and pending-operation integration
├── auth.go           # Bearer, workspace, proxy, and request context
├── http.go           # Origin policy and SDK HTTP mounting
├── tools/
│   ├── tools.go      # Deterministic canonical registration
│   └── *.go          # Domain handlers and descriptors
└── resources/
    └── *.go          # Read-only MCP resources

../toolregistry/
└── registry.go       # Descriptor contract, generated catalog, and redaction
```

## SDK

- Uses `github.com/modelcontextprotocol/go-sdk` for MCP protocol implementation
- Integrates with Irmin’s existing authentication and service layers
- Provides type-safe tool and resource definitions

## Streamable HTTP transport

The MCP server uses the Streamable HTTP transport specification, which replaces
the older HTTP+SSE transport. Key features:

- **Stateless servers**: The transport supports stateless operation, eliminating
  the requirement for high availability long-lived connections
- **Plain HTTP implementation**: MCP can be implemented as a plain HTTP server
- **Automatic initialization**: The SDK handler automatically handles session
  initialization and SSE streaming
- **Infrastructure compatibility**: Works with standard HTTP middleware and proxies

### Proxy considerations

- The SDK handler sets appropriate headers for SSE streaming:
  `Cache-Control: no-cache`, `Connection: keep-alive`
- If you terminate TLS or use a CDN, ensure it supports long-lived connections
  and does not buffer `text/event-stream` responses
- Configure the proxy CIDRs before relying on `Forwarded` or
  `X-Forwarded-For`; untrusted peers are identified by the socket address

## Testing matrix

- curl to `/mcp/attach` (HTTP-only, single-step Streamable HTTP) — should stream SSE
- `npx mcp-remote` to `/mcp` (full Streamable HTTP flow) — should connect and print MCP capabilities
- MCP Inspector to `/mcp` — should connect with Bearer auth
- `go test ./toolregistry ./mcp/tools ./mcp` — descriptor snapshots,
  initialize/list/call conformance, policy, redaction, cancellation, and bounds

## References

- [MCP Streamable HTTP Transport Specification](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/206)
- [MCP Go SDK](https://github.com/modelcontextprotocol/go-sdk)
