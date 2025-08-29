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

## Conversation Management

### List Conversations

**GET** `/conversations`

Retrieve a paginated list of all conversations with message statistics.

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

Retrieve a specific conversation by ID.

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

Retrieve messages for a specific conversation with pagination.

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

Create a new conversation.

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

Update an existing conversation.

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

Delete a conversation and all associated messages.

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
  "model": "llama3-8b-8192",
  "temperature": 0.7,
  "maxTokens": 1000,
  "useTools": false,
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
| `useTools`       | boolean| No       | false   | Enable MCP tools |
| `stream`         | boolean| No       | true    | Enable streaming response |

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

### List Available Models

**GET** `/chat/models`

Retrieve a list of available AI models with pricing and capabilities.

#### Response

```json
{
  "models": [
    {
      "name": "Llama 3 8B",
      "provider": "groq",
      "modelId": "llama3-8b-8192",
      "description": "llama3-8b-8192",
      "inputPricePerMillionTokens": 0.0000001,
      "outputPricePerMillionTokens": 0.0000002
    }
  ]
}
```

### List Available Tools

**GET** `/chat/tools`

Retrieve a list of available MCP tools.

#### Response

```json
{
  "enabled": true,
  "initialized": true,
  "tools": [
    {
      "name": "irmin",
      "description": "MCP tool: irmin",
      "type": "mcp"
    }
  ],
  "count": 1,
  "totalTools": 1
}
```

### Get MCP Status

**GET** `/chat/mcp-status`

Check the current status of MCP tool connections.

#### Response

```json
{
  "enabled": true,
  "configStatus": {
    "enabled": true,
    "serverCount": 1,
    "configKeys": ["irmin"]
  }
}
```



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
  "metadata": { "priority": "high" }
}
```

#### Request Parameters

| Parameter | Type    | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `message` | string  | Yes      | -       | User message content |
| `context` | object  | No       | {}      | Additional context for the agent |
| `conversationId` | string | No | - | Conversation identifier (used for memory and history) |
| `metadata` | object  | No       | {}      | Additional metadata |

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
    "useTools": true,
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