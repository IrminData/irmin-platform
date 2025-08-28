import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { toUIMessageStream } from '@ai-sdk/langchain';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  db,
  conversations,
  messages,
  aiModels,
  analytics,
  type NewConversation,
  type NewMessage,
} from '@/database';
import { streamingService } from '@/services/streaming';
import {
  ChatRequestSchema,
  ModelsResponseSchema,
  ToolsResponseSchema,
  McpStatusResponseSchema,
  McpReinitializeResponseSchema,
  type ChatRequest,
  type ChatResponse,
} from '@/types';

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat - Send a message and get AI response (with streaming support)
  fastify.post<{ Body: ChatRequest }>(
    '/chat',
    {
      schema: {
        body: zodToJsonSchema(ChatRequestSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: ChatRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          conversationId,
          message,
          provider = 'groq',
          model,
          temperature,
          maxTokens,
          useTools = false,
          stream = true,
        } = request.body;

        // Extract auth token for MCP tools
        const authToken = extractAuthToken(request);

        // Initialize MCP tools if needed and not already initialized with this auth token
        if (useTools) {
          await streamingService.ensureMcpInitialized(authToken);
        }

        let conversation;

        // Create or get existing conversation
        if (conversationId) {
          const existingConversation = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId));
          if (!existingConversation.length) {
            return reply.status(404).send({
              error: 'Not Found',
              message: 'Conversation not found',
              statusCode: 404,
              timestamp: new Date().toISOString(),
            });
          }
          conversation = existingConversation[0];
        } else {
          // Create new conversation
          const id = randomUUID();
          const now = new Date();
          const newConversation: NewConversation = {
            id,
            title:
              message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            createdAt: now,
            updatedAt: now,
          };

          await db.insert(conversations).values(newConversation);
          conversation = newConversation;

          // Log analytics
          await db.insert(analytics).values({
            id: randomUUID(),
            eventType: 'conversation_created',
            conversationId: id,
            createdAt: now,
          });
        }

        // Save user message
        const userMessageId = randomUUID();
        const now = new Date();
        const userMessage: NewMessage = {
          id: userMessageId,
          conversationId: conversation.id,
          role: 'user',
          content: message,
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(messages).values(userMessage);

        // Log user message analytics
        await db.insert(analytics).values({
          id: randomUUID(),
          eventType: 'message_sent',
          conversationId: conversation.id,
          messageId: userMessageId,
          createdAt: now,
        });

        // Get conversation history
        const history = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(20);

        // Transform database messages to expected format
        const transformedHistory = history.map((msg) => ({
          ...msg,
          timestamp: msg.createdAt,
          retryCount: 0,
          metadata: msg.metadata as Record<string, unknown> | undefined,
          totalTokens: msg.totalTokens || undefined,
          inputTokens: msg.inputTokens || undefined,
          outputTokens: msg.outputTokens || undefined,
          aiModelId: msg.aiModelId || undefined,
          modelProvider: msg.modelProvider || undefined,
          modelName: msg.modelName || undefined,
          processingTimeMs: msg.processingTimeMs || undefined,
          costDollars: msg.costDollars || undefined,
        }));

        // System prompts not yet implemented
        let systemPrompt: string | undefined;

        // Handle streaming vs non-streaming responses
        if (stream) {
          // Create streaming response
          const streamResponse = await streamingService.createStreamingResponse(
            {
              messages: transformedHistory.reverse(), // Reverse to get chronological order
              provider,
              model,
              temperature,
              maxTokens,
              systemPrompt,
              useTools,
              authToken,
            }
          );

          // Use Vercel's AI SDK to convert the stream to a UI message stream
          const uiMessageStream = toUIMessageStream(streamResponse);

          // Add custom headers
          reply.header('X-Conversation-Id', conversation.id);
          reply.header('X-Message-Id', userMessageId);

          // Return streaming response
          return reply.send(uiMessageStream);
        } else {
          // Create non-streaming response
          const aiResponse = await streamingService.createResponse({
            messages: transformedHistory.reverse(), // Reverse to get chronological order
            provider,
            model,
            temperature,
            maxTokens,
            systemPrompt,
            useTools,
            authToken,
          });

          const startTime = Date.now();
          const processingTime = Date.now() - startTime;

          // Save AI response
          const assistantMessageId = randomUUID();
          const assistantMessage: NewMessage = {
            id: assistantMessageId,
            conversationId: conversation.id,
            role: 'assistant',
            content: aiResponse.content,
            aiModelId: model,
            modelProvider: provider,
            modelName: model,
            inputTokens: aiResponse.usage?.promptTokens || 0,
            outputTokens: aiResponse.usage?.completionTokens || 0,
            totalTokens: aiResponse.usage?.totalTokens || 0,
            processingTimeMs: processingTime,
            costDollars: 0, // Cost calculation to be implemented
            metadata: aiResponse.usage,
            createdAt: now,
            updatedAt: now,
          };

          await db.insert(messages).values(assistantMessage);

          // Log AI model usage analytics
          await db.insert(analytics).values({
            id: randomUUID(),
            eventType: 'model_used',
            conversationId: conversation.id,
            messageId: assistantMessageId,
            aiModelId: model,
            tokenCount: aiResponse.usage?.totalTokens || 0,
            costDollars: 0,
            processingTimeMs: processingTime,
            createdAt: now,
          });

          // Update conversation updated timestamp
          await db
            .update(conversations)
            .set({ updatedAt: now })
            .where(eq(conversations.id, conversation.id));

          const response: ChatResponse = {
            conversationId: conversation.id,
            message: {
              ...assistantMessage,
              timestamp: assistantMessage.createdAt!,
              metadata: assistantMessage.metadata as
                | Record<string, unknown>
                | undefined,
            },
            usage: aiResponse.usage,
          };

          return reply.send(response);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to process chat request';
        fastify.log.error('Chat endpoint error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // GET /api/chat/models - List available models
  fastify.get('/chat/models', async (request, reply) => {
    try {
      // Get models from database with pricing and capabilities
      const dbModels = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.isActive, true));

      // Transform to match expected format
      const models = dbModels.map((model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        description: model.modelId,
        maxTokens: model.maxTokens,
        supportsStreaming: model.supportsStreaming,
        supportsFunctionCalling: model.supportsFunctions,
        pricing: {
          inputTokens: model.inputPricePerToken,
          outputTokens: model.outputPricePerToken,
        },
      }));

      const response = ModelsResponseSchema.parse({ models });
      return reply.send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch models';
      fastify.log.error('Models endpoint error: %s', errorMessage);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/chat/tools - List available MCP tools
  fastify.get('/chat/tools', async (request, reply) => {
    try {
      const mcpStatus = streamingService.getMcpStatus();

      const response = ToolsResponseSchema.parse({
        enabled: mcpStatus.enabled,
        initialized: mcpStatus.initialized,
        tools: mcpStatus.toolNames.map((name) => ({
          name,
          description: `MCP tool: ${name}`,
          type: 'mcp',
        })),
        count: mcpStatus.toolCount,
        totalTools: mcpStatus.toolCount,
      });

      return reply.send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch tools';
      fastify.log.error('Tools endpoint error: %s', errorMessage);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/chat/mcp-status - Get MCP server connection status
  fastify.get('/chat/mcp-status', async (request, reply) => {
    try {
      const status = streamingService.getMcpStatus();

      const response = McpStatusResponseSchema.parse({
        enabled: status.enabled,
        initialized: status.initialized,
        toolCount: status.toolCount,
        toolNames: status.toolNames,
        message: status.initialized
          ? `${status.toolCount} MCP tools available`
          : 'MCP tools not initialized',
      });

      return reply.send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch MCP status';
      fastify.log.error('MCP status endpoint error: %s', errorMessage);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/chat/reinitialize-mcp - Reinitialize MCP tools with new auth token
  fastify.post('/chat/reinitialize-mcp', async (request, reply) => {
    try {
      const authToken = extractAuthToken(request);

      await streamingService.reinitializeMcp(authToken);
      const status = streamingService.getMcpStatus();

      const response = McpReinitializeResponseSchema.parse({
        success: true,
        initialized: status.initialized,
        toolCount: status.toolCount,
        message: `MCP tools reinitialized with ${status.toolCount} tools`,
      });

      return reply.send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to reinitialize MCP tools';
      fastify.log.error('MCP reinitialize endpoint error: %s', errorMessage);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

/**
 * Extract JWT token from request headers
 */
function extractAuthToken(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}
