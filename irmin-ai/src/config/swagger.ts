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

    // Message block structure
    messageType: {
      type: 'string',
      enum: [
        'text',
        'tool_call',
        'tool_result',
        'reasoning',
        'source',
        'file',
        'error',
        'system',
      ],
      default: 'text',
    },
    blockId: { type: 'string', nullable: true },
    parentBlockId: { type: 'string', nullable: true },
    blockOrder: { type: 'number', default: 0 },

    // AI model information
    aiModelId: { type: 'string', nullable: true },
    modelProvider: { type: 'string', nullable: true },
    modelName: { type: 'string', nullable: true },

    // Token usage and costs
    inputTokens: { type: 'number', nullable: true },
    outputTokens: { type: 'number', nullable: true },
    totalTokens: { type: 'number', nullable: true },
    costUSD: { type: 'number', nullable: true },

    // Performance metrics
    processingTimeMs: { type: 'number', nullable: true },

    // Timestamps
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

// Vector Collection schema
const vectorCollectionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    vectorStoreUrl: { type: 'string' },
    vectorStoreApiKey: { type: 'string', nullable: true },
    embeddingModel: { type: 'string' },
    embeddingDimensions: { type: 'number' },
    workspaceSlug: { type: 'string' },
    createdBy: { type: 'string' },
    isActive: { type: 'boolean' },
    metadata: { type: 'object' },
    documentCount: { type: 'number' },
    lastIndexedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

// Document schema
const documentSchema = {
  type: 'object',
  properties: {
    pageContent: { type: 'string' },
    metadata: { type: 'object' },
  },
} as const;

// Vector search result schema
const vectorSearchResultSchema = {
  type: 'object',
  properties: {
    document: documentSchema,
    score: { type: 'number' },
  },
} as const;

export const swaggerSchemas = {
  // Chat endpoints
  chatRequest: {
    tags: ['Chat'],
    summary: 'Send a chat message',
    description:
      'Sends a message to the AI assistant and receives a response. Supports both streaming and non-streaming modes. When toolSelection is provided, enables iterative tool calling via LangGraph for enhanced problem-solving capabilities.',
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
          messages: {
            type: 'array',
            items: messageSchema,
            description: 'Array of message blocks representing the AI response',
          },
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
      'Executes a specific agent with the provided message and context. Returns a complete response. Supports iterative tool calling via LangGraph when tools are available.',
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
          toolCalls: {
            type: 'number',
            description: 'Number of tool calls made during execution',
          },
          iterations: {
            type: 'number',
            description: 'Number of thinking iterations performed',
          },
        },
      },
    },
  },

  executeAgentStream: {
    tags: ['Agents'],
    summary: 'Execute an agent (streaming)',
    description:
      'Executes a specific agent with streaming response. Returns a stream of response chunks including tool calls, thinking steps, and final results. Supports iterative tool calling via LangGraph when tools are available.',
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
        description:
          'Streaming response (text/plain) with JSON chunks for different event types',
        content: {
          'text/plain': {
            schema: {
              type: 'string',
              description:
                'Stream of JSON chunks separated by newlines. Event types include: iteration, tool_calls, tool_result, thinking, completed, error',
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

  // Embedding Collection endpoints
  listEmbeddingCollections: {
    tags: ['Embeddings'],
    summary: 'List embedding collections',
    description:
      'Retrieves a paginated list of embedding collections for the authenticated user within the selected workspace',
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
        activeOnly: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Filter to show only active collections',
          default: 'false',
        },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Paginated list of embedding collections',
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: vectorCollectionSchema,
          },
          pagination: paginationSchema,
        },
      },
    },
  },

  getEmbeddingCollection: {
    tags: ['Embeddings'],
    summary: 'Get embedding collection by ID',
    description: 'Retrieves a specific embedding collection by its ID',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    response: {
      200: {
        description: 'Embedding collection details',
        type: 'object',
        properties: vectorCollectionSchema.properties,
      },
    },
  },

  createEmbeddingCollection: {
    tags: ['Embeddings'],
    summary: 'Create a new embedding collection',
    description:
      'Creates a new embedding collection for the authenticated user within the selected workspace',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Collection name (must be unique)',
        },
        description: {
          type: 'string',
          description: 'Collection description',
        },
        vectorStoreUrl: {
          type: 'string',
          description:
            'Vector store URL (optional, uses default if not provided)',
        },
        embeddingModel: {
          type: 'string',
          description: 'Embedding model to use',
          default: 'text-embedding-3-small',
        },
        embeddingDimensions: {
          type: 'number',
          minimum: 1,
          description: 'Number of embedding dimensions',
          default: 1536,
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the collection',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'Embedding collection created successfully',
        type: 'object',
        properties: vectorCollectionSchema.properties,
      },
    },
  },

  updateEmbeddingCollection: {
    tags: ['Embeddings'],
    summary: 'Update an embedding collection',
    description: 'Updates a specific embedding collection by its ID',
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
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Collection name',
        },
        description: {
          type: 'string',
          description: 'Collection description',
        },
        vectorStoreUrl: {
          type: 'string',
          description: 'Vector store URL',
        },
        embeddingModel: {
          type: 'string',
          description: 'Embedding model to use',
        },
        embeddingDimensions: {
          type: 'number',
          minimum: 1,
          description: 'Number of embedding dimensions',
        },
        isActive: {
          type: 'boolean',
          description: 'Whether the collection is active',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the collection',
        },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Embedding collection updated successfully',
        type: 'object',
        properties: vectorCollectionSchema.properties,
      },
    },
  },

  deleteEmbeddingCollection: {
    tags: ['Embeddings'],
    summary: 'Delete an embedding collection',
    description:
      'Deletes a specific embedding collection by its ID (soft delete)',
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
        description: 'Embedding collection deleted successfully',
        type: 'null',
      },
    },
  },

  // Document indexing endpoints
  indexDocuments: {
    tags: ['Embeddings'],
    summary: 'Index documents in a collection',
    description:
      'Adds documents to an embedding collection by creating embeddings and storing them in the vector store',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: documentSchema,
          minItems: 1,
          description: 'Array of documents to index',
        },
      },
      required: ['documents'],
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'Documents indexed successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          documentCount: { type: 'number' },
          collectionName: { type: 'string' },
        },
      },
    },
  },

  // Search and retrieval endpoints
  searchEmbeddings: {
    tags: ['Embeddings'],
    summary: 'Search embeddings in a collection',
    description:
      'Performs similarity search on documents in an embedding collection',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          description: 'Search query',
        },
        k: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Number of results to return',
          default: 5,
        },
        filter: {
          type: 'object',
          description: 'Metadata filters to apply',
        },
        scoreThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Minimum similarity score threshold',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Search results',
        type: 'object',
        properties: {
          documents: {
            type: 'array',
            items: vectorSearchResultSchema,
          },
          query: { type: 'string' },
          totalResults: { type: 'number' },
          processingTime: { type: 'number' },
        },
      },
    },
  },

  retrieveContext: {
    tags: ['Embeddings'],
    summary: 'Retrieve context for generation',
    description:
      'Retrieves relevant context from an embedding collection for use in AI generation',
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          description: 'Query to retrieve context for',
        },
        maxDocuments: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: 'Maximum number of documents to retrieve',
          default: 5,
        },
        scoreThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Minimum similarity score threshold',
          default: 0.0,
        },
        includeMetadata: {
          type: 'boolean',
          description: 'Whether to include metadata in the context',
          default: false,
        },
        maxTokens: {
          type: 'number',
          minimum: 1,
          maximum: 10000,
          description: 'Maximum number of tokens in the context',
          default: 4000,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Retrieved context',
        type: 'object',
        properties: {
          context: { type: 'string' },
          sources: {
            type: 'array',
            items: documentSchema,
          },
          totalTokens: { type: 'number' },
        },
      },
    },
  },

  // Embedding creation endpoints
  createEmbedding: {
    tags: ['Embeddings'],
    summary: 'Create a single embedding using collection model',
    description:
      "Creates an embedding for a single text input using the specified collection's embedding model",
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          minLength: 1,
          description: 'Text to create embedding for',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata',
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'Embedding created successfully',
        type: 'object',
        properties: {
          embedding: {
            type: 'array',
            items: { type: 'number' },
          },
          text: { type: 'string' },
          metadata: { type: 'object' },
          dimensions: { type: 'number' },
          collectionId: { type: 'string' },
          embeddingModel: { type: 'string' },
        },
      },
    },
  },

  createEmbeddings: {
    tags: ['Embeddings'],
    summary: 'Create multiple embeddings using collection model',
    description:
      "Creates embeddings for multiple text inputs using the specified collection's embedding model",
    security: [{ bearerAuth: [], workspaceHeader: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        texts: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
          },
          minItems: 1,
          description: 'Array of texts to create embeddings for',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata',
        },
      },
      required: ['texts'],
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'Embeddings created successfully',
        type: 'object',
        properties: {
          embeddings: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'number' },
            },
          },
          texts: {
            type: 'array',
            items: { type: 'string' },
          },
          metadata: { type: 'object' },
          count: { type: 'number' },
          dimensions: { type: 'number' },
          collectionId: { type: 'string' },
          embeddingModel: { type: 'string' },
        },
      },
    },
  },

  // System Embedding Collection endpoints (for AI_API_SYSTEM_TOKEN)
  systemListEmbeddingCollections: {
    tags: ['System Embeddings'],
    summary: 'List all embedding collections (System Access)',
    description:
      'Retrieves a paginated list of all embedding collections across all workspaces. Requires system token authentication.',
    security: [{ bearerAuth: [] }],
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
        activeOnly: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Filter to show only active collections',
          default: 'false',
        },
        workspaceSlug: {
          type: 'string',
          description: 'Filter collections by workspace slug (optional)',
        },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Paginated list of all embedding collections',
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: vectorCollectionSchema,
          },
          pagination: paginationSchema,
        },
      },
    },
  },

  systemGetEmbeddingCollection: {
    tags: ['System Embeddings'],
    summary: 'Get embedding collection by ID (System Access)',
    description:
      'Retrieves any embedding collection by its ID. Requires system token authentication.',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Collection ID',
        },
      },
      required: ['id'],
    },
    response: {
      200: {
        description: 'Embedding collection details',
        type: 'object',
        properties: vectorCollectionSchema.properties,
      },
    },
  },

  systemCreateEmbeddingCollection: {
    tags: ['System Embeddings'],
    summary: 'Create a new embedding collection (System Access)',
    description:
      'Creates a new embedding collection. Can create system collections without workspace association. Requires system token authentication.',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Collection name (must be unique)',
        },
        description: {
          type: 'string',
          description: 'Collection description',
        },
        vectorStoreUrl: {
          type: 'string',
          description:
            'Vector store URL (optional, uses default if not provided)',
        },
        embeddingModel: {
          type: 'string',
          description: 'Embedding model to use',
          default: 'text-embedding-3-small',
        },
        embeddingDimensions: {
          type: 'number',
          minimum: 1,
          description: 'Number of embedding dimensions',
          default: 1536,
        },
        workspaceSlug: {
          type: 'string',
          description: 'Workspace slug (optional for system collections)',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the collection',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'Embedding collection created successfully',
        type: 'object',
        properties: vectorCollectionSchema.properties,
      },
    },
  },

  systemUpdateEmbeddingCollection: {
    tags: ['System Embeddings'],
    summary: 'Update an embedding collection (System Access)',
    description:
      'Updates any embedding collection by its ID. Requires system token authentication.',
    security: [{ bearerAuth: [] }],
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
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Collection name',
        },
        description: {
          type: 'string',
          description: 'Collection description',
        },
        vectorStoreUrl: {
          type: 'string',
          description: 'Vector store URL',
        },
        embeddingModel: {
          type: 'string',
          description: 'Embedding model to use',
        },
        embeddingDimensions: {
          type: 'number',
          minimum: 1,
          description: 'Number of embedding dimensions',
        },
        isActive: {
          type: 'boolean',
          description: 'Whether the collection is active',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the collection',
        },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Embedding collection updated successfully',
        type: 'object',
        properties: vectorCollectionSchema.properties,
      },
    },
  },

  systemDeleteEmbeddingCollection: {
    tags: ['System Embeddings'],
    summary: 'Delete an embedding collection (System Access)',
    description:
      'Deletes any embedding collection by its ID (soft delete). Requires system token authentication.',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    response: {
      204: {
        description: 'Embedding collection deleted successfully',
        type: 'null',
      },
    },
  },
} as const;
