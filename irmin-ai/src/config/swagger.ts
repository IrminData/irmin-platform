/**
 * Centralized OpenAPI/Swagger schema definitions for the Irmin AI API
 */

// Pagination schema
const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number' },
    limit: { type: 'number' },
    total: { type: 'number' },
    totalPages: { type: 'number' },
  },
} as const;

// User schema
const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    first_name: { type: 'string' },
    last_name: { type: 'string' },
  },
} as const;

// Workspace schema
const workspaceSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
  },
} as const;

// Message schema
const messageSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    conversationId: { type: 'string' },
    role: { type: 'string', enum: ['user', 'assistant', 'system'] },
    content: { type: 'string' },
    metadata: { type: 'object' },
    aiModelId: { type: 'string', nullable: true },
    modelProvider: { type: 'string', nullable: true },
    modelName: { type: 'string', nullable: true },
    inputTokens: { type: 'number', nullable: true },
    outputTokens: { type: 'number', nullable: true },
    totalTokens: { type: 'number', nullable: true },
    costUSD: { type: 'number', nullable: true },
    processingTimeMs: { type: 'number', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

// Conversation schema
const conversationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    metadata: { type: 'object' },
    agentId: { type: 'string', nullable: true },
    workspaceSlug: { type: 'string' },
    userId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    messageCount: { type: 'number' },
    totalTokens: { type: 'number' },
    totalCost: { type: 'number' },
  },
} as const;

// AI Model schema
const aiModelSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    provider: { type: 'string' },
    modelId: { type: 'string' },
    description: { type: 'string' },
    inputPricePerMillionTokens: { type: 'number' },
    outputPricePerMillionTokens: { type: 'number' },
  },
} as const;

// MCP Tool schema
const mcpToolSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    inputSchema: { type: 'object' },
  },
} as const;

// Agent schema
const agentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string', enum: ['chat', 'single-shot'] },
    capabilities: {
      type: 'array',
      items: { type: 'string' },
    },
    systemPrompt: { type: 'string' },
    defaultModel: { type: 'string' },
    defaultProvider: { type: 'string' },
    supportsMCP: { type: 'boolean' },
    supportsStreaming: { type: 'boolean' },
  },
} as const;

// Tool selection schema
const toolSelectionSchema = {
  type: 'object',
  description: 'Tool selection options for MCP tools',
  properties: {
    includeAll: { type: 'boolean', description: 'Include all available tools' },
    includeTools: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific tools to include',
    },
    excludeTools: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tools to exclude',
    },
  },
} as const;

// Usage statistics schema
const usageSchema = {
  type: 'object',
  properties: {
    promptTokens: { type: 'number' },
    completionTokens: { type: 'number' },
    totalTokens: { type: 'number' },
  },
} as const;

export const swaggerSchemas = {
  // Chat endpoints
  chatRequest: {
    tags: ['Chat'],
    summary: 'Send a chat message',
    description:
      'Sends a message to the AI assistant and receives a response. Supports both streaming and non-streaming modes.',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    body: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description:
            'ID of the conversation (optional, creates new conversation if not provided)',
        },
        message: {
          type: 'string',
          minLength: 1,
          description: 'The user message to send to the AI',
        },
        provider: {
          type: 'string',
          enum: ['groq', 'openai'],
          description: 'AI provider to use',
          default: 'groq',
        },
        model: {
          type: 'string',
          description:
            'Specific model to use (uses provider default if not specified)',
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 2,
          description:
            'Temperature for AI response (0 = deterministic, 2 = very creative)',
        },
        maxTokens: {
          type: 'number',
          minimum: 1,
          maximum: 4000,
          description: 'Maximum number of tokens in the response',
        },
        toolSelection: toolSelectionSchema,
        stream: {
          type: 'boolean',
          description: 'Whether to stream the response',
          default: true,
        },
      },
      required: ['message'],
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Successful chat response',
        type: 'object',
        properties: {
          conversationId: { type: 'string' },
          message: messageSchema,
          usage: usageSchema,
        },
      },
    },
  },

  // Info endpoints
  userProfile: {
    tags: ['Info'],
    summary: 'Get authenticated user profile',
    description:
      'Retrieves the profile information of the currently authenticated user',
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        description: 'User profile retrieved successfully',
        type: 'object',
        properties: {
          user: userSchema,
          token: { type: 'string' },
        },
      },
    },
  },

  workspaceInfo: {
    tags: ['Info'],
    summary: 'Get workspace information',
    description: 'Retrieves information about the currently selected workspace',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    response: {
      200: {
        description: 'Workspace information retrieved successfully',
        type: 'object',
        properties: {
          workspace: workspaceSchema,
          slug: { type: 'string' },
        },
      },
    },
  },

  listModels: {
    tags: ['Info'],
    summary: 'List available AI models',
    description:
      'Retrieves a list of all available AI models with their capabilities and pricing',
    response: {
      200: {
        description: 'AI models retrieved successfully',
        type: 'object',
        properties: {
          models: {
            type: 'array',
            items: aiModelSchema,
          },
        },
      },
    },
  },

  listMcpTools: {
    tags: ['Info'],
    summary: 'List available MCP tools',
    description:
      'Retrieves a list of available Model Context Protocol (MCP) tools for the authenticated user',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    response: {
      200: {
        description: 'MCP tools retrieved successfully',
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          tools: {
            type: 'array',
            items: mcpToolSchema,
          },
          count: { type: 'number' },
          servers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
              },
            },
          },
          totalServers: { type: 'number' },
        },
      },
    },
  },

  // Agent endpoints
  listAgents: {
    tags: ['Agents'],
    summary: 'List available agents',
    description:
      'Retrieves a list of all available AI agents and their configurations',
    response: {
      200: {
        description: 'List of available agents',
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: agentSchema,
          },
        },
      },
    },
  },

  executeAgent: {
    tags: ['Agents'],
    summary: 'Execute an agent (non-streaming)',
    description:
      'Executes a specific agent with the provided message and context. Returns a complete response.',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          minLength: 1,
          description: 'ID of the agent to execute',
        },
      },
      required: ['agentId'],
    },
    body: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          minLength: 1,
          description: 'The message to send to the agent',
        },
        context: {
          type: 'object',
          description: 'Additional context for the agent',
        },
        conversationId: {
          type: 'string',
          description: 'ID of the conversation to associate with',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the request',
        },
        messageHistoryLimit: {
          type: 'number',
          description: 'Limit the number of messages to include in the history',
          default: 20,
        },
        toolSelection: toolSelectionSchema,
      },
      required: ['message'],
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Agent execution successful',
        type: 'object',
        properties: {
          content: { type: 'string' },
          agentId: { type: 'string' },
          conversationId: { type: 'string' },
          usage: usageSchema,
          processingTimeMs: { type: 'number' },
        },
      },
    },
  },

  executeAgentStream: {
    tags: ['Agents'],
    summary: 'Execute an agent (streaming)',
    description:
      'Executes a specific agent with streaming response. Returns a stream of response chunks.',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          minLength: 1,
          description: 'ID of the agent to execute',
        },
      },
      required: ['agentId'],
    },
    body: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          minLength: 1,
          description: 'The message to send to the agent',
        },
        context: {
          type: 'object',
          description: 'Additional context for the agent',
        },
        conversationId: {
          type: 'string',
          description: 'ID of the conversation to associate with',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the request',
        },
        messageHistoryLimit: {
          type: 'number',
          description: 'Limit the number of messages to include in the history',
          default: 20,
        },
        toolSelection: toolSelectionSchema,
      },
      required: ['message'],
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Streaming response (text/plain)',
        content: {
          'text/plain': {
            schema: {
              type: 'string',
              description: 'Stream of JSON chunks separated by newlines',
            },
          },
        },
      },
    },
  },

  agentConfig: {
    tags: ['Agents'],
    summary: 'Get agent configuration',
    description: 'Retrieves the configuration details for a specific agent',
    params: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          minLength: 1,
          description: 'ID of the agent to get configuration for',
        },
      },
      required: ['agentId'],
    },
    response: {
      200: {
        description: 'Agent configuration retrieved successfully',
        type: 'object',
        properties: agentSchema.properties,
      },
    },
  },

  // Conversation endpoints
  listConversations: {
    tags: ['Conversations'],
    summary: 'List conversations',
    description:
      'Retrieves a paginated list of conversations for the authenticated user within the selected workspace',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    querystring: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          pattern: '^[1-9]\\d*$',
          description: 'Page number (1-based)',
          default: '1',
        },
        limit: {
          type: 'string',
          pattern: '^[1-9]\\d*$',
          description: 'Number of items per page (max 100)',
          default: '20',
        },
        sortBy: {
          type: 'string',
          enum: ['title', 'createdAt', 'updatedAt'],
          description: 'Field to sort by',
          default: 'updatedAt',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order',
          default: 'desc',
        },
        agentId: {
          type: 'string',
          description:
            'Filter by agent ID. Empty string for chat-only conversations (null agentId), specific agentId for agent-specific conversations, or omit for all conversations',
        },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Paginated list of conversations',
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: conversationSchema,
          },
          pagination: paginationSchema,
        },
      },
    },
  },

  getConversation: {
    tags: ['Conversations'],
    summary: 'Get conversation by ID',
    description: 'Retrieves a specific conversation by its ID',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Conversation ID',
        },
      },
      required: ['id'],
    },
    response: {
      200: {
        description: 'Conversation details',
        type: 'object',
        properties: conversationSchema.properties,
      },
    },
  },

  getMessages: {
    tags: ['Conversations'],
    summary: 'Get messages by conversation ID',
    description: 'Retrieves all messages for a specific conversation by its ID',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    querystring: {
      type: 'object',
      properties: {
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order for messages',
          default: 'asc',
        },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'List of messages',
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: messageSchema,
          },
        },
      },
    },
  },

  createConversation: {
    tags: ['Conversations'],
    summary: 'Create a new conversation',
    description:
      'Creates a new conversation for the authenticated user within the selected workspace',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        metadata: { type: 'object' },
        agentId: { type: 'string' },
      },
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'Conversation created successfully',
        type: 'object',
        properties: conversationSchema.properties,
      },
    },
  },

  updateConversation: {
    tags: ['Conversations'],
    summary: 'Update a conversation',
    description: 'Updates a specific conversation by its ID',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        metadata: { type: 'object' },
        agentId: { type: 'string' },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Conversation updated successfully',
        type: 'object',
        properties: conversationSchema.properties,
      },
    },
  },

  generateConversationTitle: {
    tags: ['Conversations'],
    summary: 'Generate a title for a conversation',
    description: 'Generates a title for a conversation',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    response: {
      200: {
        description: 'Conversation title generated successfully',
        type: 'object',
        properties: conversationSchema.properties,
      },
    },
  },

  deleteConversation: {
    tags: ['Conversations'],
    summary: 'Delete a conversation',
    description: 'Deletes a specific conversation by its ID',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    response: {
      204: {
        description: 'Conversation deleted successfully',
        type: 'null',
      },
    },
  },
} as const;
