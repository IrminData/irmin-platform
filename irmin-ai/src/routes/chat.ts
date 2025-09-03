import {
  conversations,
  db,
  messages,
  type NewConversation,
  type NewMessage,
} from '@/database';
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
import { createStoredUIMessageStream } from '@/utils/streaming';

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
          messageHistoryLimit,
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

          // For chat route, ensure the conversation doesn't have an agentId set
          // (chat route is for regular chat, not agent-specific conversations)
          if (conversation.agentId) {
            sendInternalServerError(
              reply,
              'This conversation is associated with a specific agent and cannot be used for regular chat',
              fastify.log
            );
            return;
          }
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

        // Save user message first
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

        // Fetch conversation history AFTER saving the user message to include it
        // This ensures we get the complete conversation context including the current user message
        const conversationHistory = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(messageHistoryLimit || 20);

        // Reverse the history to chronological order for LLM processing
        const chronologicalHistory = conversationHistory.reverse();

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
              messages: chronologicalHistory,
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

          // Create the stored UI message stream using the shared utility
          const streamStartTime = Date.now(); // Capture start time for accurate processing time calculation
          const readableStream = createStoredUIMessageStream(streamResponse, {
            conversationId: conversation.id,
            startTime: streamStartTime, // Pass start time for accurate processing time calculation
            modelProvider: provider,
            model: model || llmService.getDefaultModels()[provider],
            history: chronologicalHistory, // Use chronological history including the current user message
          });

          // Return streaming response
          return reply.send(readableStream);
        } else {
          // Create non-streaming response
          const aiResponse = await completionService.createResponse({
            messages: chronologicalHistory,
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
            chronologicalHistory,
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
