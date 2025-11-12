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
- Streamable HTTP transport: real-time communication with AI models using the MCP Streamable HTTP specification
- HTTP single-step attach endpoint: `GET /mcp/attach` for clients that need a simplified connection flow (e.g., Langflow HTTP transport)

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
├── attach.go        # /mcp/attach single-step Streamable HTTP endpoint
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

## Testing matrix

- curl to `/mcp/attach` (HTTP-only, single-step Streamable HTTP) — should stream SSE
- `npx mcp-remote` to `/mcp` (full Streamable HTTP flow) — should connect and print MCP capabilities
- MCP Inspector to `/mcp` — should connect with Bearer auth

## References

- [MCP Streamable HTTP Transport Specification](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/206)
- [MCP Go SDK](https://github.com/modelcontextprotocol/go-sdk)
