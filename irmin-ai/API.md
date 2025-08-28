# Irmin AI API Documentation

This document describes the API endpoints for the Irmin AI service, including conversation management and chat functionality.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
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
      "costDollars": 0.003,
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
| `provider`       | string | No       | groq    | AI model provider |
| `model`          | string | No       | -       | Specific model to use |
| `temperature`    | number | No       | -       | Response randomness (0.0-1.0) |
| `maxTokens`      | number | No       | -       | Maximum response length |
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
    "aiModelId": "llama3-8b-8192",
    "modelProvider": "groq",
    "modelName": "llama3-8b-8192",
    "inputTokens": 100,
    "outputTokens": 50,
    "totalTokens": 150,
    "processingTimeMs": 2500,
    "costDollars": 0.003,
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "timestamp": "2024-01-01T00:00:00.000Z"
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
      "id": "llama3-8b-8192",
      "name": "Llama 3 8B",
      "provider": "groq",
      "description": "llama3-8b-8192",
      "maxTokens": 8192,
      "supportsStreaming": true,
      "supportsFunctionCalling": false,
      "pricing": {
        "inputTokens": 0.0000001,
        "outputTokens": 0.0000002
      }
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
      "name": "tool_name",
      "description": "MCP tool: tool_name",
      "type": "mcp"
    }
  ],
  "count": 5,
  "totalTools": 5
}
```

### Get MCP Status

**GET** `/chat/mcp-status`

Check the current status of MCP tool connections.

#### Response

```json
{
  "enabled": true,
  "initialized": true,
  "toolCount": 5,
  "toolNames": ["tool1", "tool2", "tool3", "tool4", "tool5"],
  "message": "5 MCP tools available"
}
```

### Reinitialize MCP Tools

**POST** `/chat/reinitialize-mcp`

Reinitialize MCP tools with a new authentication token.

#### Response

```json
{
  "success": true,
  "initialized": true,
  "toolCount": 5,
  "message": "MCP tools reinitialized with 5 tools"
}
```

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

### Common HTTP Status Codes

- **200** - Success
- **201** - Created
- **204** - No Content
- **400** - Bad Request
- **404** - Not Found
- **500** - Internal Server Error

## Rate Limiting

Rate limiting may be applied to prevent abuse. Check response headers for rate limit information.

## WebSocket Support

The chat endpoint supports streaming responses for real-time AI interactions. Use the `stream: true` parameter to enable streaming.

## MCP Tools

Model Context Protocol (MCP) tools can be enabled by setting `useTools: true` in chat requests. These tools provide additional capabilities beyond standard AI responses.

Tools are initialized per authentication token and can be reinitialized using the `/chat/reinitialize-mcp` endpoint.
