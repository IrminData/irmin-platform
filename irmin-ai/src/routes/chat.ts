import {
  conversations,
  db,
  messages,
  type NewConversation,
  type NewMessage,
} from '@/database';
import { toUIMessageStream } from '@ai-sdk/langchain';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { analyticsService } from '@/services/analytics';
import { completionService } from '@/services/completion';
import { llmService } from '@/services/llm';
import { systemPromptBuilder } from '@/services/systemPromptBuilder';
import { titleGenerationService } from '@/services/titleGeneration';

import { swaggerSchemas } from '@/config/swagger';

import {
  type ChatRequest,
  ChatRequestSchema,
  type ChatResponse,
  ChatResponseSchema,
} from '@/types/chat';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';
import { sendOkResponse } from '@/utils/responses';

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat - Send a message and get AI response (with streaming support)
  fastify.post<{ Body: ChatRequest }>(
    '/chat',
    {
      schema: swaggerSchemas.chatRequest,
    },
    async (request, reply) => {
      const chatRequest = ChatRequestSchema.parse(request.body);
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
        } = chatRequest;

        // Get authenticated user and workspace context (set by middleware)
        const authContext = request.auth;
        const workspaceContext = request.workspace;
        if (!authContext || !workspaceContext) {
          throw new Error('Authentication and workspace context required');
        }
        const authToken = authContext.token;

        // MCP tools are now created per-request, no initialization needed

        let conversation;

        // Create or get existing conversation
        if (conversationId) {
          const existingConversation = await db
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.id, conversationId),
                eq(conversations.workspaceSlug, workspaceContext.slug),
                eq(conversations.userId, authContext.user.id)
              )
            );
          if (!existingConversation.length) {
            sendNotFoundError(reply, 'Conversation not found', fastify.log);
            return;
          }
          conversation = existingConversation[0];
        } else {
          // Create new conversation with initial fallback title
          const id = randomUUID();
          const now = new Date();
          const newConversation: NewConversation = {
            id,
            title:
              message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            workspaceSlug: workspaceContext.slug,
            userId: authContext.user.id,
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

          // Generate proper title asynchronously (don't wait for it)
          titleGenerationService
            .updateConversationTitleIfNeeded(id, {
              message,
              user: authContext.user,
              workspace: workspaceContext.workspace,
              authToken,
            })
            .catch((error) => {
              fastify.log.warn(
                'Failed to generate conversation title: %s',
                error instanceof Error ? error.message : 'Unknown error'
              );
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
        await analyticsService.logMessageSent(conversation.id, userMessageId);

        // Get conversation history
        const history = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(20);

        // Build system prompt with context
        const systemPrompt = systemPromptBuilder.buildSystemPrompt(
          undefined, // Use default system prompt for chat
          {
            user: authContext.user,
            workspace: workspaceContext.workspace,
            conversationId: conversation.id,
          }
        );

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
}
