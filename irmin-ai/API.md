# Irmin AI API Documentation

This document describes the API endpoints for the Irmin AI service, including conversation management, chat functionality, and AI agents.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your-irmin-jwt-token>
```

### Token Validation

The authentication middleware validates JWT tokens by making a request to the main Irmin API's profile endpoint (`/v1/profile`). This ensures that:

- The token is valid and not expired
- The user account is still active
- The user profile information is up-to-date
- The token has the necessary permissions for API access

If the token validation fails (invalid token, expired, or user not found), the API will return a 401 Unauthorized error. The validated user profile is then attached to the request context and made available to route handlers.

## Workspace Selection

All API endpoints require workspace selection via the `X-Workspace-Slug` header. This ensures proper billing attribution and access control for all operations.

```
X-Workspace-Slug: <workspace-slug>
```

The workspace selection middleware:
- Validates that the authenticated user has access to the specified workspace
- Fetches the complete workspace details from the main Irmin API
- Attaches the workspace context to the request for use by route handlers
- Ensures all API operations are properly attributed to the correct workspace for billing purposes

If the workspace doesn't exist, the user doesn't have access, or the header is missing, the API will return an appropriate error (400, 403, or 404).

## Conversation Management

All conversation operations are scoped to the authenticated user and specified workspace. Users can only access conversations they created within workspaces they have permission to access.

### List Conversations

**GET** `/conversations`

Retrieve a paginated list of conversations for the authenticated user in the specified workspace.

#### Query Parameters

| Parameter | Type    | Default | Description                    |
|-----------|---------|---------|--------------------------------|
| `page`    | integer | 1       | Page number (minimum: 1)      |
| `limit`   | integer | 20      | Items per page (1-100)        |
| `sortBy`  | string  | updatedAt | Sort field (title, createdAt, updatedAt) |
| `sortOrder` | string | desc    | Sort direction (asc, desc)    |

#### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Conversation Title",
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "messageCount": 5,
      "totalTokens": 1500,
      "totalCost": 0.05
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Error Response

```json
{
  "error": "Internal Server Error",
  "message": "Error description",
  "statusCode": 500,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Conversation

**GET** `/conversations/:id`

Retrieve a specific conversation by ID. Only returns the conversation if it belongs to the authenticated user and specified workspace.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Conversation UUID              |

#### Response

```json
{
  "id": "uuid",
  "title": "Conversation Title",
  "metadata": {},
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Conversation Messages

**GET** `/conversations/:id/messages`

Retrieve messages for a specific conversation with pagination. Only returns messages if the conversation belongs to the authenticated user and specified workspace.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Conversation UUID              |

#### Query Parameters

| Parameter | Type    | Default | Description                    |
|-----------|---------|---------|--------------------------------|
| `page`    | integer | 1       | Page number (minimum: 1)      |
| `limit`   | integer | 50      | Items per page (1-100)        |
| `sortOrder` | string | asc     | Sort direction (asc, desc)    |

#### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "role": "user",
      "content": "Message content",
      "aiModelId": "gpt-4",
      "modelProvider": "openai",
      "modelName": "GPT-4",
      "inputTokens": 100,
      "outputTokens": 50,
      "totalTokens": 150,
      "processingTimeMs": 2500,
      "costUSD": 0.003,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

### Create Conversation

**POST** `/conversations`

Create a new conversation in the specified workspace for the authenticated user.

#### Request Body

```json
{
  "title": "New Conversation",
  "metadata": {}
}
```

#### Response

**Status:** 201 Created

```json
{
  "id": "uuid",
  "title": "New Conversation",
  "metadata": {},
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Conversation

**PUT** `/conversations/:id`

Update an existing conversation. Only allows updates to conversations owned by the authenticated user in the specified workspace.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Conversation UUID              |

#### Request Body

```json
{
  "title": "Updated Title",
  "metadata": { "key": "value" }
}
```

#### Response

```json
{
  "id": "uuid",
  "title": "Updated Title",
  "metadata": { "key": "value" },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Delete Conversation

**DELETE** `/conversations/:id`

Delete a conversation and all associated messages. Only allows deletion of conversations owned by the authenticated user in the specified workspace.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Conversation UUID              |

#### Response

**Status:** 204 No Content

## Chat Functionality

### Send Message

**POST** `/chat`

Send a message and receive an AI response. Supports both streaming and non-streaming responses.

#### Request Body

```json
{
  "conversationId": "uuid",
  "message": "Hello, how are you?",
  "provider": "groq",
  "model": "llama-3.1-8b-instant",
  "temperature": 0.7,
  "maxTokens": 1000,
  "toolSelection": {
    "includeAll": true
  },
  "stream": true
}
```

#### Request Parameters

| Parameter | Type    | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `conversationId` | string | No       | -       | Existing conversation ID (creates new if not provided) |
| `message`        | string | Yes      | -       | User message content |
| `provider`       | string | No       | groq    | AI model provider (groq, openai) |
| `model`          | string | No       | -       | Specific model to use |
| `temperature`    | number | No       | -       | Response randomness (0.0-2.0) |
| `maxTokens`      | number | No       | -       | Maximum response length (1-4000) |
| `toolSelection`  | object | No       | -       | MCP tool selection configuration |
| `stream`         | boolean| No       | true    | Enable streaming response |

#### Tool Selection Configuration

The `toolSelection` object allows granular control over which MCP tools are available:

```json
{
  "toolSelection": {
    "includeAll": true                    // Include all available tools
  }
}
```

```json
{
  "toolSelection": {
    "includeTools": ["list_workspaces", "list_docs"]  // Include specific tools only
  }
}
```

```json
{
  "toolSelection": {
    "excludeTools": ["create_workspace"]  // Exclude specific tools
  }
}
```

```json
{
  "toolSelection": {
    "includeTools": ["list_workspaces", "list_repositories"],
    "excludeTools": ["create_workspace"]  // Combine include and exclude
  }
}
```

**Tool Selection Options:**
- `includeAll`: Include all available tools
- `includeTools`: Array of specific tool names to include
- `excludeTools`: Array of specific tool names to exclude
- `includeServers`: Array of MCP server names to include all tools from (future feature)

#### Tool Configuration Examples

**Include all tools (default behavior):**
```json
{
  "toolSelection": {
    "includeAll": true
  }
}
```

**Include only documentation tools:**
```json
{
  "toolSelection": {
    "includeTools": [
      "list_docs",
      "get_docs",
    ]
  }
}
```

**Include only data query and analysis tools:**
```json
{
  "toolSelection": {
    "includeTools": [
      "execute_sql",
      "create_query",
      "update_query",
      "list_stored_queries",
      "execute_query",
      "get_repository_object_schema"
    ]
  }
}
```

#### Streaming Response

When `stream: true`, returns a streaming response with headers:

```
X-Conversation-Id: <conversation-uuid>
X-Message-Id: <message-uuid>
```

#### Non-Streaming Response

When `stream: false`, returns a complete response:

```json
{
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "content": "AI response content",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "metadata": {}
  },
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150
  }
}
```

## Information Endpoints

### Get User Profile

**GET** `/info/user`

Retrieve the authenticated user's profile information.

#### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes | Bearer token for authentication |

#### Response

```json
{
  "user": {
    "id": "user-uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "company": "Example Corp",
    "profile_picture": "https://example.com/avatar.jpg",
    "roles": [
      {
        "id": "role-uuid",
        "name": "admin",
        "description": "Administrator role"
      }
    ]
  },
  "token": "jwt-token-string"
}
```

### Get Workspace Information

**GET** `/info/workspace`

Retrieve information about the currently selected workspace.

#### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes | Bearer token for authentication |
| `X-Workspace-Slug` | string | Yes | Workspace slug for workspace selection |

#### Response

```json
{
  "workspace": {
    "id": "workspace-uuid",
    "name": "My Workspace",
    "slug": "my-workspace",
    "description": "A sample workspace for development",
    "owner": {
      "id": "user-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "company": "Example Corp",
      "profile_picture": "https://example.com/avatar.jpg"
    },
    "users": [
      {
        "id": "user-uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "company": "Example Corp",
        "profile_picture": "https://example.com/avatar.jpg"
      }
    ]
  },
  "slug": "my-workspace"
}
```

### List Available Models

**GET** `/info/models`

Retrieve a list of available AI models with pricing and capabilities.

#### Response

```json
{
  "models": [
    {
      "name": "Llama 3 8B",
      "provider": "groq",
      "modelId": "llama-3.1-8b-instant",
      "description": "llama-3.1-8b-instant",
      "inputPricePerMillionTokens": 0.0000001,
      "outputPricePerMillionTokens": 0.0000002
    }
  ]
}
```

### List Available Tools

**GET** `/info/tools`

Retrieve detailed information about all available MCP tools for the authenticated user, including tool schemas, server information, and authentication requirements.

#### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | Yes | Bearer token for authentication |
| `X-Workspace-Slug` | string | Yes | Workspace slug for workspace-specific tool filtering and billing |

#### Response

```json
{
  "enabled": true,
  "tools": [
    {
      "name": "list_workspaces",
      "description": "List workspaces accessible to the current user. Most tool calls require a workspace to be specified.",
      "type": "mcp",
      "schema": {
        "type": "object",
        "additionalProperties": {
          "not": {}
        },
        "$schema": "http://json-schema.org/draft-07/schema#"
      },
      "serverId": "irmin",
      "requiresAuth": true
    },
    {
      "name": "list_repositories",
      "description": "List repositories in a workspace. Data objects are stored in, and queried from repositories.",
      "type": "mcp",
      "schema": {
        "type": "object",
        "properties": {
          "workspace_slug": {
            "type": "string",
            "description": "required,The slug of the workspace to list repositories in"
          }
        },
        "required": ["workspace_slug"],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      },
      "serverId": "irmin",
      "requiresAuth": true
    },
    {
      "name": "execute_sql",
      "description": "Execute an arbitrary SQL query on the workspace data. It's recommended to read the documentation for queries first, use `list_docs` tool for more information.",
      "type": "mcp",
      "schema": {
        "type": "object",
        "properties": {
          "sql": {
            "type": "string",
            "description": "required,The SQL query to execute"
          },
          "workspace_slug": {
            "type": "string",
            "description": "required,The slug of the workspace to execute SQL in"
          }
        },
        "required": ["sql", "workspace_slug"],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      },
      "serverId": "irmin",
      "requiresAuth": true
    }
  ],
  "count": 47,
  "servers": [
    {
      "id": "irmin",
      "type": "url",
      "requiresAuth": true,
      "toolCount": 47
    }
  ],
  "totalServers": 1
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether MCP tools are enabled |
| `tools` | array | Array of available tools |
| `tools[].name` | string | Tool name/identifier |
| `tools[].description` | string | Tool description |
| `tools[].type` | string | Tool type (always "mcp") |
| `tools[].schema` | object | Tool input/output schema (optional) |
| `tools[].serverId` | string | MCP server that provides this tool |
| `tools[].requiresAuth` | boolean | Whether the tool requires authentication |
| `count` | number | Total number of available tools |
| `servers` | array | Array of MCP server information |
| `servers[].id` | string | Server identifier |
| `servers[].type` | string | Server type ("command" or "url") |
| `servers[].requiresAuth` | boolean | Whether the server requires authentication |
| `servers[].toolCount` | number | Number of tools provided by this server |
| `totalServers` | number | Total number of configured servers |



## AI Agents

The AI agents system provides specialized AI assistants for different tasks, including chat, query generation, scripting, and title generation.

### Execute Agent

**POST** `/agents/:agentId`

Execute a single AI agent with the specified message and context.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `agentId` | string | Yes      | Agent identifier (chat, query, scripting, title-generation) |

#### Request Body

```json
{
  "message": "Help me understand microservices architecture",
  "context": {
    "schema": "database_schema",
    "userPreferences": { "language": "go" }
  },
  "conversationId": "conv-456",
  "metadata": { "priority": "high" },
  "toolSelection": {
    "includeAll": true
  }
}
```

#### Request Parameters

| Parameter | Type    | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `message` | string  | Yes      | -       | User message content |
| `context` | object  | No       | {}      | Additional context for the agent |
| `conversationId` | string | No | - | Conversation identifier (used for memory and history) |
| `metadata` | object  | No       | {}      | Additional metadata |
| `toolSelection` | object | No       | -       | MCP tool selection configuration (overrides agent default) |

#### Response

```json
{
  "content": "AI response content",
  "metadata": {
    "agentId": "chat",
    "type": "chat",
    "context": {}
  },
  "usage": {
    "promptTokens": 150,
    "completionTokens": 300,
    "totalTokens": 450
  }
}
```

### Execute Agent with Streaming

**POST** `/agents/:agentId/stream`

Execute an AI agent with streaming response support.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `agentId` | string | Yes      | Agent identifier |

#### Request Body

Same as non-streaming agent execution.

#### Streaming Response

Returns a Server-Sent Events (SSE) stream with headers:

```
X-Agent-Id: <agent-id>
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### List Available Agents

**GET** `/agents`

Retrieve a list of all available AI agents with their configurations.

#### Response

```json
[
  {
    "id": "chat",
    "name": "General Assistant Chat Agent",
    "description": "General purpose chat agent that can answer questions and help with tasks",
    "type": "chat",
    "modelProvider": "groq",
    "model": "qwen/qwen3-32b",
    "temperature": 0.7,
    "maxTokens": 4000,
    "responseFormat": "markdown",
    "contextRequirements": [
      {
        "type": "conversation",
        "name": "conversation_history",
        "required": false
      }
    ],
    "thinkingEnabled": true,
    "toolSelection": {
      "includeAll": true
    },
    "streaming": true
  }
]
```

### Get Agent Configuration

**GET** `/agents/:agentId/config`

Retrieve the configuration for a specific agent.

#### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `agentId` | string | Yes      | Agent identifier |

#### Response

Same as the agent object in the agents list.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error description",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```