import { conversations, db, messages, type NewConversation } from '@/database';
import { randomUUID } from 'crypto';
import { asc, count, desc, eq, sum } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { analyticsService } from '@/services/analytics';

import {
  type ConversationCreateRequest,
  ConversationCreateRequestSchema,
  type ConversationMessagesQuery,
  ConversationMessagesQuerySchema,
  type ConversationQuery,
  ConversationQuerySchema,
  ConversationSchema,
  type ConversationUpdateRequest,
  ConversationUpdateRequestSchema,
  PaginatedConversationsResponseSchema,
  PaginatedMessagesResponseSchema,
} from '@/types/conversation';

import { sendInternalServerError, sendNotFoundError } from '@/utils/errors';
import {
  sendCreatedResponse,
  sendNoContentResponse,
  sendOkResponse,
} from '@/utils/responses';

interface ConversationParams {
  id: string;
}

export async function conversationRoutes(fastify: FastifyInstance) {
  // GET /api/conversations - List all conversations with pagination
  fastify.get<{ Querystring: ConversationQuery }>(
    '/conversations',
    {
      schema: {
        querystring: zodToJsonSchema(ConversationQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ConversationQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          page = 1,
          limit = 20,
          sortBy = 'updatedAt',
          sortOrder = 'desc',
        } = request.query;
        const offset = (page - 1) * limit;

        // Count total records
        const totalResult = await db
          .select({ count: count() })
          .from(conversations);
        const total = totalResult[0]?.count || 0;

        // Get sorted column
        const sortColumn =
          sortBy === 'title'
            ? conversations.title
            : sortBy === 'createdAt'
              ? conversations.createdAt
              : conversations.updatedAt;

        const orderFn = sortOrder === 'asc' ? asc : desc;

        // Get conversations with message stats
        const data = await db
          .select({
            id: conversations.id,
            title: conversations.title,
            metadata: conversations.metadata,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
            messageCount: count(messages.id),
            totalTokens: sum(messages.totalTokens),
            totalCost: sum(messages.costUSD),
          })
          .from(conversations)
          .leftJoin(messages, eq(conversations.id, messages.conversationId))
          .groupBy(conversations.id)
          .orderBy(orderFn(sortColumn))
          .limit(limit)
          .offset(offset);

        const response = {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
        sendOkResponse(
          reply,
          PaginatedConversationsResponseSchema,
          response,
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch conversations';
        fastify.log.error('List conversations error: %s', errorMessage);

        // Log error analytics
        await analyticsService.logError(
          'list_conversations_failed',
          errorMessage,
          undefined,
          undefined
        );

        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/conversations/:id - Get specific conversation
  fastify.get<{ Params: ConversationParams }>(
    '/conversations/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ConversationParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));

        if (!conversation.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        sendOkResponse(reply, ConversationSchema, conversation[0], fastify.log);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch conversation';
        fastify.log.error('Get conversation error: %s', errorMessage);

        // Log error analytics
        await analyticsService.logError(
          'get_conversation_failed',
          errorMessage,
          undefined,
          undefined
        );

        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/conversations/:id/messages - Get conversation messages
  fastify.get<{
    Params: ConversationParams;
    Querystring: ConversationMessagesQuery;
  }>(
    '/conversations/:id/messages',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        querystring: zodToJsonSchema(ConversationMessagesQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: ConversationParams;
        Querystring: ConversationMessagesQuery;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { page = 1, limit = 50, sortOrder = 'asc' } = request.query;
        const offset = (page - 1) * limit;

        // Check if conversation exists
        const conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));
        if (!conversation.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        // Count messages
        const totalResult = await db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.conversationId, id));
        const total = totalResult[0]?.count || 0;

        // Get messages
        const orderFn = sortOrder === 'asc' ? asc : desc;
        const data = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, id))
          .orderBy(orderFn(messages.createdAt))
          .limit(limit)
          .offset(offset);

        const response = {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
        sendOkResponse(
          reply,
          PaginatedMessagesResponseSchema,
          response,
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch conversation messages';
        fastify.log.error('Get conversation messages error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // POST /api/conversations - Create new conversation
  fastify.post<{ Body: ConversationCreateRequest }>(
    '/conversations',
    {
      schema: {
        body: zodToJsonSchema(ConversationCreateRequestSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: ConversationCreateRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { title, metadata } = request.body;
        const id = randomUUID();
        const now = new Date();

        const newConversation: NewConversation = {
          id,
          title: title || 'New Conversation',
          metadata,
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(conversations).values(newConversation);

        // Log analytics
        await analyticsService.logConversationEvent(
          'conversation_created',
          id,
          { title }
        );

        sendCreatedResponse(
          reply,
          ConversationSchema,
          newConversation,
          fastify.log
        );
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create conversation';
        fastify.log.error('Create conversation error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // PUT /api/conversations/:id - Update conversation
  fastify.put<{ Params: ConversationParams; Body: ConversationUpdateRequest }>(
    '/conversations/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: zodToJsonSchema(ConversationUpdateRequestSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: ConversationParams;
        Body: ConversationUpdateRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const updateData = request.body;

        // Check if conversation exists
        const existing = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));
        if (!existing.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        // Update conversation
        const updates: Partial<NewConversation> = { updatedAt: new Date() };
        if (updateData.title !== undefined) updates.title = updateData.title;
        if (updateData.metadata !== undefined)
          updates.metadata = updateData.metadata;

        await db
          .update(conversations)
          .set(updates)
          .where(eq(conversations.id, id));

        // Log analytics
        await analyticsService.logConversationEvent(
          'conversation_updated',
          id,
          {
            title: updateData.title,
            metadata: updateData.metadata,
          }
        );

        // Get updated conversation
        const updated = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));
        sendOkResponse(reply, ConversationSchema, updated[0], fastify.log);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update conversation';
        fastify.log.error('Update conversation error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // DELETE /api/conversations/:id - Delete conversation and all its messages
  fastify.delete<{ Params: ConversationParams }>(
    '/conversations/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ConversationParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;

        // Check if conversation exists
        const conversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));
        if (!conversation.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        // Log analytics before deletion
        await analyticsService.logConversationEvent(
          'conversation_deleted',
          id,
          {
            title: conversation[0].title,
          }
        );

        // Delete conversation (messages and analytics will be deleted by CASCADE)
        await db.delete(conversations).where(eq(conversations.id, id));

        sendNoContentResponse(reply);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to delete conversation';
        fastify.log.error('Delete conversation error: %s', errorMessage);
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );
}
