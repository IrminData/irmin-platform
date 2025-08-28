import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, asc, count, sum } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  db,
  conversations,
  messages,
  analytics,
  type NewConversation,
} from '@/database';
import {
  ConversationCreateRequestSchema,
  ConversationUpdateRequestSchema,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
} from '@/types';

interface ConversationParams {
  id: string;
}

interface ConversationQuery {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export async function conversationRoutes(fastify: FastifyInstance) {
  // GET /api/conversations - List all conversations with pagination
  fastify.get<{ Querystring: ConversationQuery }>(
    '/conversations',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sortBy: { type: 'string', default: 'updatedAt' },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
          },
        },
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
            totalCost: sum(messages.costDollars),
          })
          .from(conversations)
          .leftJoin(messages, eq(conversations.id, messages.conversationId))
          .groupBy(conversations.id)
          .orderBy(orderFn(sortColumn))
          .limit(limit)
          .offset(offset);

        return reply.send({
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch conversations';
        fastify.log.error('List conversations error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
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
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        return reply.send(conversation[0]);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch conversation';
        fastify.log.error('Get conversation error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // GET /api/conversations/:id/messages - Get conversation messages
  fastify.get<{ Params: ConversationParams; Querystring: ConversationQuery }>(
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
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: ConversationParams;
        Querystring: ConversationQuery;
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
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
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

        return reply.send({
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch conversation messages';
        fastify.log.error('Get conversation messages error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
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
        await db.insert(analytics).values({
          id: randomUUID(),
          eventType: 'conversation_created',
          conversationId: id,
          eventData: { title },
          createdAt: now,
        });

        return reply.status(201).send(newConversation);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create conversation';
        fastify.log.error('Create conversation error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
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
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
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

        // Get updated conversation
        const updated = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));
        return reply.send(updated[0]);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update conversation';
        fastify.log.error('Update conversation error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
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
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        // Delete conversation (messages and analytics will be deleted by CASCADE)
        await db.delete(conversations).where(eq(conversations.id, id));

        return reply.status(204).send();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to delete conversation';
        fastify.log.error('Delete conversation error: %s', errorMessage);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: errorMessage,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}
