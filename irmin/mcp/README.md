# Irmin MCP Server

This package contains a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server implemented in Go using the official `go-sdk`. The MCP server provides AI models with programmatic access to Irmin's data warehouse functionality.

Run `npx @modelcontextprotocol/inspector` to test and inspect the MCP server.

## Features

- **Workspace Management**: Create new workspaces for data organization
- **Resource Access**: Read user profile and workspace information
- **Authentication**: Secure access using API tokens or Clerk JWT tokens
- **Streamable HTTP Transport**: Real-time communication with AI models

## Getting Started

The MCP server runs as an embedded component within the main Irmin API application.

The MCP server is mounted inside the main HTTP server. Configure its mount path with the env `MCP_HTTP_PATH` (default `/mcp`).

- Main server: `http://localhost:<PORT>` (env `PORT`, default in `.env`)
- MCP endpoint: `http://localhost:<PORT><MCP_HTTP_PATH>`

## Authentication

The MCP server requires authentication using the `Authorization` header with a Bearer token:

```
Authorization: Bearer <token>
```

The token can be:
- A generated profile-specific API token from Irmin
- A JWT token from Clerk authentication

System tokens are not permitted for MCP access.

## Available Tools

### `create_workspace`
Creates a new workspace for the authenticated user.

**Arguments:**
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Returns:** JSON representation of the created workspace

## Available Resources

### `irmin://profile`
Returns the authenticated user's profile information in JSON format.

**URI:** `irmin://profile`  
**MIME Type:** `application/json`

### `irmin://workspaces` 
Returns a list of all workspaces accessible to the authenticated user.

**URI:** `irmin://workspaces`  
**MIME Type:** `application/json`

## Development

### Adding New Tools
1. Create a new tool function in `mcp/tools/`
2. Register it in `mcp/tools/register.go` via the `RegisterAll` function
3. Tools receive authenticated user context and can access all API services

### Adding New Resources
1. Create a new resource function in `mcp/resources/`
2. Register it in `mcp/resources/register.go` via the `RegisterAll` function
3. Resources provide read-only access to data with proper authentication

### Project Structure
```
mcp/
├── server.go           # Main server setup and authentication
├── tools/
│   ├── register.go     # Tool registration
│   └── workspaces.go   # Workspace-related tools
└── resources/
    ├── register.go     # Resource registration
    ├── profile.go      # User profile resource
    └── workspaces.go   # Workspaces list resource
```

## SDK

- Uses `github.com/modelcontextprotocol/go-sdk` for MCP protocol implementation
- Integrates with Irmin's existing authentication and service layers
- Provides type-safe tool and resource definitions

## Testing

Use the MCP Inspector to test the server:

```bash
npx @modelcontextprotocol/inspector
```

Connect to: `http://localhost:<PORT><MCP_HTTP_PATH>` with appropriate authentication headers.
