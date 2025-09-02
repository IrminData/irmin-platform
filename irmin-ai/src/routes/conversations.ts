import { conversations, db, messages, type NewConversation } from '@/database';
import { randomUUID } from 'crypto';
import { and, asc, count, desc, eq, sum } from 'drizzle-orm';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { analyticsService } from '@/services/analytics';
import { titleGenerationService } from '@/services/titleGeneration';

import {
  type ConversationCreateRequest,
  ConversationSchema,
  type ConversationUpdateRequest,
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
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
    };
  }>(
    '/conversations',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string', pattern: '^[1-9]\\d*$' },
            limit: { type: 'string', pattern: '^[1-9]\\d*$' },
            sortBy: {
              type: 'string',
              enum: ['title', 'createdAt', 'updatedAt'],
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: string;
          limit?: string;
          sortBy?: string;
          sortOrder?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Parse query parameters manually since we're using JSON schema validation
        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        const limit = request.query.limit
          ? parseInt(request.query.limit, 10)
          : 20;
        const sortBy = request.query.sortBy || 'updatedAt';
        const sortOrder = request.query.sortOrder || 'desc';

        // Validate parsed values
        if (page < 1) {
          throw new Error('Page must be at least 1');
        }
        if (limit < 1 || limit > 100) {
          throw new Error('Limit must be between 1 and 100');
        }

        const offset = (page - 1) * limit;

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Count total records for this workspace and user
        const totalResult = await db
          .select({ count: count() })
          .from(conversations)
          .where(
            and(
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          );
        const total = totalResult[0]?.count || 0;

        // Get sorted column
        const sortColumn =
          sortBy === 'title'
            ? conversations.title
            : sortBy === 'createdAt'
              ? conversations.createdAt
              : conversations.updatedAt;

        const orderFn = sortOrder === 'asc' ? asc : desc;

        // Get conversations with message stats for this workspace and user
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
          .where(
            and(
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          )
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

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const conversation = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          );

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
        sendInternalServerError(reply, errorMessage, fastify.log);
        return;
      }
    }
  );

  // GET /api/conversations/:id/messages - Get conversation messages
  fastify.get<{
    Params: ConversationParams;
    Querystring: { page?: string; limit?: string; sortOrder?: string };
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
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string', pattern: '^[1-9]\\d*$' },
            limit: { type: 'string', pattern: '^[1-9]\\d*$' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: ConversationParams;
        Querystring: { page?: string; limit?: string; sortOrder?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;

        // Parse query parameters manually since we're using JSON schema validation
        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        const limit = request.query.limit
          ? parseInt(request.query.limit, 10)
          : 50;
        const sortOrder = request.query.sortOrder || 'asc';

        // Validate parsed values
        if (page < 1) {
          throw new Error('Page must be at least 1');
        }
        if (limit < 1 || limit > 100) {
          throw new Error('Limit must be between 1 and 100');
        }

        const offset = (page - 1) * limit;

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check if conversation exists and user has access
        const conversation = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          );
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
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            metadata: { type: 'object' },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: ConversationCreateRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { title, metadata } = request.body;

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const id = randomUUID();
        const now = new Date();

        const newConversation: NewConversation = {
          id,
          title: title || 'New Conversation',
          metadata,
          workspaceSlug: workspaceContext.slug,
          userId: authContext.user.id,
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
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            metadata: { type: 'object' },
          },
          additionalProperties: false,
        },
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

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check if conversation exists and user has access
        const existing = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          );
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

  // POST /api/conversations/:id/generate-title - Generate a new title for the conversation
  fastify.post<{ Params: ConversationParams }>(
    '/conversations/:id/generate-title',
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

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check if conversation exists and user has access
        const conversation = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          );
        if (!conversation.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        // Get the first user message to use for title generation
        const firstUserMessage = await db
          .select()
          .from(messages)
          .where(
            and(eq(messages.conversationId, id), eq(messages.role, 'user'))
          )
          .orderBy(asc(messages.createdAt))
          .limit(1);

        if (!firstUserMessage.length) {
          sendInternalServerError(
            reply,
            'No user messages found in conversation',
            fastify.log
          );
          return;
        }

        // Generate new title
        const titleResult = await titleGenerationService.generateTitle({
          message: firstUserMessage[0].content,
          user: authContext.user,
          workspace: workspaceContext.workspace,
          authToken: authContext.token,
          conversationId: id,
        });

        // Update conversation with new title
        await db
          .update(conversations)
          .set({
            title: titleResult.title,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, id));

        // Log analytics
        await analyticsService.logConversationEvent(
          'conversation_updated',
          id,
          {
            titleGenerated: true,
            oldTitle: conversation[0].title,
            newTitle: titleResult.title,
            generated: titleResult.generated,
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
            : 'Failed to generate conversation title';
        fastify.log.error('Generate title error: %s', errorMessage);
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

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check if conversation exists and user has access
        const conversation = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          );
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
