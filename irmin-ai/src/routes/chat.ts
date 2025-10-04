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
import { systemMessageCacheService } from '@/services/systemMessageCache';
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
import { textSanitizer } from '@/utils/sanitization';
import {
  applyStreamingHeaders,
  createStoredUIMessageStream,
  processStreamingResponse,
} from '@/utils/streaming';

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat - Send a message and get AI response (with streaming support)
  fastify.post<{ Body: ChatRequest }>(
    '/chat',
    {
      schema: swaggerSchemas.chatRequest,
    },
    async (request, reply) => {
      const chatRequest = ChatRequestSchema.parse(request.body);
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
          // Create new conversation with fallback title
          const id = randomUUID();
          const now = new Date();

          // Use titleGenerationService to create fallback title
          const fallbackTitle = titleGenerationService.createFallbackTitle();

          const newConversation: NewConversation = {
            id,
            title: fallbackTitle,
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
        }

        // Sanitize user message
        const sanitizedMessage = textSanitizer.sanitizeUserMessage(message);

        // Validate message is not empty after sanitization
        if (
          !sanitizedMessage.sanitized ||
          sanitizedMessage.sanitized.trim().length === 0
        ) {
          sendInternalServerError(
            reply,
            'Message cannot be empty',
            fastify.log
          );
          return;
        }

        // Save user message first (sanitized)
        const userMessageId = randomUUID();
        const now = new Date();
        const userMessage: NewMessage = {
          id: userMessageId,
          conversationId: conversation.id,
          role: 'user',
          content: sanitizedMessage.sanitized,
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

        // Get or create system message (cached per conversation)
        const systemPrompt =
          await systemMessageCacheService.getOrCreateSystemMessage(
            conversation.id,
            null, // Use default system prompt for chat
            {
              user: authContext.user,
              workspace: workspaceContext.workspace,
              conversationId: conversation.id,
            }
          );

        // Always use streaming internally for consistency
        const streamResponse = await completionService.createStreamingResponse({
          messages: chronologicalHistory,
          provider,
          model,
          temperature,
          maxTokens,
          systemPrompt: systemPrompt || undefined,
          toolSelection,
          authToken,
          conversationId: conversation.id,
          useAgentGraph: !!toolSelection, // Use LangGraph when tools are being used
          maxToolCalls: 5,
        });

        if (stream) {
          // Return streaming response directly
          applyStreamingHeaders(reply, {
            'X-Conversation-Id': conversation.id,
            'X-Message-Id': userMessageId,
          });

          const streamStartTime = Date.now();
          const readableStream = createStoredUIMessageStream(streamResponse, {
            conversationId: conversation.id,
            startTime: streamStartTime,
            modelProvider: provider,
            model: model || llmService.getDefaultModels()[provider],
            history: chronologicalHistory,
            userMessage: sanitizedMessage.sanitized,
            user: authContext.user,
            workspace: workspaceContext.workspace,
          });

          return reply.send(readableStream);
        } else {
          // Collect streaming results for non-streaming response
          const result = await processStreamingResponse(streamResponse, {
            conversationId: conversation.id,
            startTime: Date.now(),
            modelProvider: provider,
            model: model || llmService.getDefaultModels()[provider],
            history: chronologicalHistory,
            returnStream: false,
            userMessage: sanitizedMessage.sanitized,
            user: authContext.user,
            workspace: workspaceContext.workspace,
          });

          const response: ChatResponse = {
            conversationId: conversation.id,
            messages: result.messages || [],
          };

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
