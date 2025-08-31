import {
  aiModels,
  conversations,
  db,
  messages,
  type NewConversation,
  type NewMessage,
} from '@/database';
import { toUIMessageStream } from '@ai-sdk/langchain';
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { analyticsService } from '@/services/analytics';
import { completionService } from '@/services/completion';
import { llmService } from '@/services/llm';
import { mcpService } from '@/services/mcp';

import {
  type ChatRequest,
  ChatRequestSchema,
  type ChatResponse,
  ChatResponseSchema,
  McpToolsResponseSchema,
  ModelsResponseSchema,
} from '@/types/chat';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';
import { sendOkResponse } from '@/utils/responses';

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
      const startTime = Date.now();
      let conversation: typeof conversations.$inferSelect | undefined;
      try {
        const {
          conversationId,
          message,
          provider = 'groq',
          model,
          temperature,
          maxTokens,
          toolSelection,
          stream = true,
        } = request.body;

        // Get authenticated user context (set by auth middleware)
        const authContext = request.auth;
        if (!authContext) {
          throw new Error('Authentication required');
        }
        const authToken = authContext.token;

        // MCP tools are now created per-request, no initialization needed

        let conversation;

        // Create or get existing conversation
        if (conversationId) {
          const existingConversation = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId));
          if (!existingConversation.length) {
            sendNotFoundError(reply, 'Conversation not found', fastify.log);
            return;
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
          await analyticsService.logConversationEvent(
            'conversation_created',
            id
          );
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
        await analyticsService.logMessageSent(conversation.id, userMessageId);

        // Get conversation history
        const history = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(20);

        // System prompts not yet implemented
        let systemPrompt: string | undefined;

        // Handle streaming vs non-streaming responses
        if (stream) {
          // Create streaming response
          const streamResponse =
            await completionService.createStreamingResponse({
              messages: history,
              provider,
              model,
              temperature,
              maxTokens,
              systemPrompt,
              toolSelection,
              authToken,
            });

          // Log performance analytics for streaming
          const responseTime = Date.now() - startTime;
          await analyticsService.logCustomEvent({
            eventType: 'model_used',
            conversationId: conversation.id,
            processingTimeMs: responseTime,
            eventData: {
              provider,
              model,
              stream: true,
              toolSelection,
            },
          });

          // Add custom headers
          reply.header('X-Conversation-Id', conversation.id);
          reply.header('X-Message-Id', userMessageId);

          // Use Vercel's AI SDK to convert the stream to a UI message stream
          const uiMessageStream = toUIMessageStream(streamResponse);

          // Convert the UI message stream to a format that Fastify can handle
          const readableStream = new ReadableStream({
            async start(controller) {
              let fullContent = '';

              try {
                // Consume the UI message stream and convert it to chunks
                for await (const chunk of uiMessageStream) {
                  if (chunk && typeof chunk === 'object') {
                    // Extract content from the chunk
                    if (chunk.type === 'text-delta' && chunk.delta) {
                      fullContent += chunk.delta;
                    }

                    // Convert the chunk to a JSON string
                    const chunkData = JSON.stringify(chunk);
                    controller.enqueue(
                      new TextEncoder().encode(chunkData + '\n')
                    );
                  }
                }

                // Store the assistant message in the database once stream is complete
                if (fullContent) {
                  const assistantMessageId = randomUUID();
                  const assistantMessage: NewMessage = {
                    id: assistantMessageId,
                    conversationId: conversation.id,
                    role: 'assistant',
                    content: fullContent,
                    aiModelId: model,
                    modelProvider: provider,
                    modelName: model,
                    processingTimeMs: Date.now() - startTime,
                    createdAt: now,
                    updatedAt: now,
                  };

                  // Calculate cost based on usage
                  const costCalculation = llmService.calculateUsage(
                    history,
                    fullContent,
                    provider,
                    model || llmService.getDefaultModels()[provider]
                  );

                  // Update the message with calculated cost and tokens
                  assistantMessage.costUSD = costCalculation.totalCost;
                  assistantMessage.inputTokens = costCalculation.inputTokens;
                  assistantMessage.outputTokens = costCalculation.outputTokens;
                  assistantMessage.totalTokens = costCalculation.totalTokens;

                  await db.insert(messages).values(assistantMessage);

                  // Update conversation updated timestamp
                  await db
                    .update(conversations)
                    .set({ updatedAt: now })
                    .where(eq(conversations.id, conversation.id));

                  // Log assistant message analytics
                  await analyticsService.logAgentUsed(
                    conversation.id,
                    assistantMessageId
                  );
                }

                controller.close();
              } catch (error) {
                console.error('Error stringifying UI message stream:', error);
                controller.error(error);
              }
            },
          });

          // Return streaming response
          return reply.send(readableStream);
        } else {
          // Create non-streaming response
          const aiResponse = await completionService.createResponse({
            messages: history,
            provider,
            model,
            temperature,
            maxTokens,
            systemPrompt,
            toolSelection,
            authToken,
          });

          const processingTime = Date.now() - startTime;

          // Calculate cost based on usage
          const costCalculation = llmService.calculateUsage(
            history,
            aiResponse.content,
            provider,
            model || llmService.getDefaultModels()[provider],
            aiResponse.usage?.promptTokens,
            aiResponse.usage?.completionTokens
          );

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
            inputTokens: costCalculation.inputTokens,
            outputTokens: costCalculation.outputTokens,
            totalTokens: costCalculation.totalTokens,
            processingTimeMs: processingTime,
            costUSD: costCalculation.totalCost,
            createdAt: now,
            updatedAt: now,
          };

          await db.insert(messages).values(assistantMessage);

          // Update conversation updated timestamp
          await db
            .update(conversations)
            .set({ updatedAt: now })
            .where(eq(conversations.id, conversation.id));

          const response: ChatResponse = {
            conversationId: conversation.id,
            message: {
              id: assistantMessage.id,
              conversationId: assistantMessage.conversationId,
              role: assistantMessage.role,
              content: assistantMessage.content,
              metadata: assistantMessage.metadata as
                | Record<string, unknown>
                | undefined,
              aiModelId: assistantMessage.aiModelId || null,
              modelProvider: assistantMessage.modelProvider || null,
              modelName: assistantMessage.modelName || null,
              inputTokens: assistantMessage.inputTokens || null,
              outputTokens: assistantMessage.outputTokens || null,
              totalTokens: assistantMessage.totalTokens || null,
              costUSD: assistantMessage.costUSD || null,
              processingTimeMs: assistantMessage.processingTimeMs || null,
              createdAt: assistantMessage.createdAt!,
              updatedAt: assistantMessage.updatedAt!,
            },
            usage: aiResponse.usage,
          };

          // Log performance analytics
          const responseTime = Date.now() - startTime;
          await analyticsService.logCustomEvent({
            eventType: 'model_used',
            conversationId: conversation.id,
            processingTimeMs: responseTime,
            eventData: {
              provider,
              model,
              toolSelection,
              stream: false,
            },
          });

          sendOkResponse(reply, ChatResponseSchema, response, fastify.log);
          return;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to process chat request';
        fastify.log.error('Chat endpoint error: %s', errorMessage);

        // Log error analytics if we have conversation context
        if (conversation?.id) {
          await analyticsService.logError(
            'chat_request_failed',
            error instanceof Error ? error.message : errorMessage,
            conversation.id,
            undefined
          );
        }

        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/chat/models - List available models
  fastify.get('/chat/models', async (_, reply) => {
    try {
      // Get models from database with pricing and capabilities
      const dbModels = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.isActive, true));

      // Transform to match expected format
      const models = dbModels.map((model) => ({
        name: model.name,
        provider: model.provider,
        modelId: model.modelId,
        description: model.description,
        inputPricePerMillionTokens: model.inputPricePerMillionTokens,
        outputPricePerMillionTokens: model.outputPricePerMillionTokens,
      }));

      sendOkResponse(reply, ModelsResponseSchema, { models }, fastify.log);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch models';
      fastify.log.error('Models endpoint error: %s', errorMessage);
      sendInternalServerError(reply, errorMessage, fastify.log);
      return;
    }
  });

  // GET /api/chat/tools - List available MCP tools
  fastify.get('/chat/tools', async (request, reply) => {
    try {
      // Get authenticated user context (set by auth middleware)
      const authContext = request.auth;
      if (!authContext) {
        throw new Error('Authentication required');
      }
      const authToken = authContext.token;

      const mcpTools = await mcpService.getTools(authToken);

      sendOkResponse(
        reply,
        McpToolsResponseSchema,
        {
          enabled: mcpTools.enabled,
          tools: mcpTools.tools,
          count: mcpTools.count,
          servers: mcpTools.servers,
          totalServers: mcpTools.totalServers,
        },
        fastify.log
      );
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch tools';
      fastify.log.error('Tools endpoint error: %s', errorMessage);
      sendInternalServerError(reply, errorMessage, fastify.log);
      return;
    }
  });
}
