# Irmin MCP server

This package contains a Model Context Protocol (MCP) server implemented in Go
using the official `go-sdk`. The MCP server provides AI models with programmatic
access to Irmin’s data warehouse functionality.

You can test the server with the MCP Inspector or via the single-step HTTP
attach endpoint.

## Features

- Workspace management: create new workspaces for data organisation
- Resource access: read user profile and workspace information
- Authentication: secure access using API tokens or Clerk JWT tokens
- Streamable HTTP transport: real-time communication with AI models
- HTTP single-step attach endpoint: `GET /mcp/attach` for clients that don’t
  support session handshakes (e.g., Langflow HTTP transport)

## Endpoints

- Main server: `http://localhost:<PORT>` (env `PORT`, default in `.env`)
- MCP (full flow): `http://localhost:<PORT><MCP_HTTP_PATH>` (default `/mcp`)
  - For clients that implement the MCP streamable HTTP handshake (e.g., `mcp-remote`,
    Claude Desktop, Inspector)
- MCP attach (single-step SSE): `http://localhost:<PORT><MCP_HTTP_PATH>/attach`
  - For HTTP-only clients that need a single `GET` SSE with Bearer auth (e.g., Langflow)

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

## Quick start

### Test the HTTP attach endpoint (single-step SSE)

```bash
curl -i \
  -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:<PORT>/mcp/attach
```

You should see `HTTP/1.1 200 OK` and a streaming response
`Content-Type: text/event-stream`.

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
- `<MCP_HTTP_PATH>` for the standard streamable HTTP flow (kept intact)
- `<MCP_HTTP_PATH>/attach` for single-step SSE attach (HTTP-only clients)

### Adding new tools
1. Create a new tool function in `mcp/tools/`
2. Register it in `mcp/tools/register.go` via `RegisterAll`
3. Tools receive authenticated user context and can access all API services

### Adding new resources
1. Create a new resource function in `mcp/resources/`
2. Register it in `mcp/resources/register.go` via `RegisterAll`
3. Resources provide read-only access with proper authentication

### Project structure

```
mcp/
├── server.go        # Wire-up for MCP server and routes
├── auth.go          # Auth plumbing (Bearer, user context)
├── http.go          # Wrapper and mounting of the SDK HTTP handler
├── attach.go        # /mcp/attach single-step SSE endpoint
├── pipewriter.go    # Minimal ResponseWriter for in-process streaming
├── tools/
│   ├── register.go  # Tool registration
│   └── workspaces.go
└── resources/
    ├── register.go  # Resource registration
    ├── profile.go
    └── workspaces.go
```

## SDK

- Uses `github.com/modelcontextprotocol/go-sdk` for MCP protocol implementation
- Integrates with Irmin’s existing authentication and service layers
- Provides type-safe tool and resource definitions

## SSE/proxy considerations

- We set `Cache-Control: no-cache`, `Connection: keep-alive`, and
  `X-Accel-Buffering: no` for SSE responses.
- Heartbeat pings are sent periodically on `/mcp/attach` to prevent idle timeouts
  in proxies.
- If you terminate TLS or use an extra CDN, ensure it supports long-lived
  connections and does not buffer `text/event-stream`.

## Testing matrix

- curl to `/mcp/attach` (HTTP-only, single-step SSE) — should stream
- `npx mcp-remote` to `/mcp` (full flow) — should connect and print MCP capabilities
- MCP Inspector to `/mcp` — should connect with Bearer auth
