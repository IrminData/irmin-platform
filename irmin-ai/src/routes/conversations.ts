import { AgentsManager } from '@/agents';
import { conversations, db, type NewConversation } from '@/database';
import { and, asc, count, desc, eq, gt, isNull, lt } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { ulid } from 'ulid';

import { analyticsService } from '@/services/analytics';
import { titleGenerationService } from '@/services/titleGeneration';

import { swaggerSchemas } from '@/config/swagger';

import {
  type ConversationRequest,
  ConversationRequestSchema,
  ConversationSchema,
  ConversationWithStatsSchema,
  CursorPaginatedConversationsResponseSchema,
  PaginatedConversationsResponseSchema,
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
  const agentsManager = new AgentsManager();

  // GET /api/conversations - List all conversations with pagination
  // Supports both offset-based (page/limit) and cursor-based (cursor/limit) pagination
  // Cursor pagination is more efficient for deep pages - O(1) vs O(n) for offset
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
      agentId?: string;
      cursor?: string; // ISO 8601 datetime string for cursor-based pagination
    };
  }>(
    '/conversations',
    {
      schema: swaggerSchemas.listConversations,
    },
    async (request, reply) => {
      try {
        // Parse query parameters manually since we're using JSON schema validation
        const limit = request.query.limit
          ? parseInt(request.query.limit, 10)
          : 20;
        const sortBy = request.query.sortBy || 'updatedAt';
        const sortOrder = request.query.sortOrder || 'desc';
        const agentId = request.query.agentId;
        const cursor = request.query.cursor;

        // Validate limit
        if (limit < 1 || limit > 100) {
          throw new Error('Limit must be between 1 and 100');
        }

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Build base where conditions
        const baseConditions = and(
          eq(conversations.workspaceSlug, workspaceContext.slug),
          eq(conversations.userId, authContext.user.id)
        );

        // Add agentId filtering
        let whereConditions = baseConditions;
        if (agentId === '') {
          // Empty string means "chat only" (null agentId)
          whereConditions = and(baseConditions, isNull(conversations.agentId));
        } else if (agentId !== undefined) {
          // Specific agentId filter
          whereConditions = and(
            baseConditions,
            eq(conversations.agentId, agentId)
          );
        }
        // If agentId is undefined, no additional filtering (show all conversations)

        // Get sorted column (for cursor pagination, we use updatedAt/createdAt)
        const sortColumn =
          sortBy === 'title'
            ? conversations.title
            : sortBy === 'createdAt'
              ? conversations.createdAt
              : conversations.updatedAt;

        const orderFn = sortOrder === 'asc' ? asc : desc;

        // Common select fields to avoid duplication
        const selectFields = {
          id: conversations.id,
          title: conversations.title,
          metadata: conversations.metadata,
          agentId: conversations.agentId,
          workspaceSlug: conversations.workspaceSlug,
          userId: conversations.userId,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        };

        // Use cursor-based pagination if cursor is provided
        if (cursor) {
          // Cursor pagination only works with time-based sorting (createdAt or updatedAt)
          // Title-based sorting is not compatible with cursor pagination
          if (sortBy === 'title') {
            throw new Error(
              'Cursor pagination is not supported with title-based sorting. Use offset pagination instead.'
            );
          }

          const cursorDate = new Date(cursor);
          if (isNaN(cursorDate.getTime())) {
            throw new Error(
              'Invalid cursor format. Expected ISO 8601 datetime.'
            );
          }

          // For cursor pagination, add condition to get records before/after cursor
          // For DESC order: get records with timestamp < cursor (older records)
          // For ASC order: get records with timestamp > cursor (newer records)
          // We use less-than/greater-than-or-equal combined with id ordering to handle
          // records with duplicate timestamps at page boundaries
          const cursorColumn =
            sortBy === 'createdAt'
              ? conversations.createdAt
              : conversations.updatedAt;
          const cursorCondition =
            sortOrder === 'asc'
              ? gt(cursorColumn, cursorDate)
              : lt(cursorColumn, cursorDate);
          whereConditions = and(whereConditions, cursorCondition);

          // Add secondary sort on id for deterministic ordering when timestamps are equal
          const data = await db
            .select(selectFields)
            .from(conversations)
            .where(whereConditions)
            .groupBy(conversations.id)
            .orderBy(orderFn(sortColumn), orderFn(conversations.id))
            .limit(limit);

          // For cursor pagination, return nextCursor instead of page numbers
          const nextCursor =
            data.length === limit && data.length > 0
              ? (sortBy === 'createdAt'
                  ? data[data.length - 1].createdAt
                  : data[data.length - 1].updatedAt
                ).toISOString()
              : null;

          const response = {
            data,
            pagination: {
              limit,
              nextCursor,
              hasMore: data.length === limit,
            },
          };
          sendOkResponse(
            reply,
            CursorPaginatedConversationsResponseSchema,
            response,
            fastify.log
          );
          return;
        }

        // Offset-based pagination (original behavior)
        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        if (page < 1) {
          throw new Error('Page must be at least 1');
        }
        const offset = (page - 1) * limit;

        // Count total records for this workspace and user with agentId filter
        const totalResult = await db
          .select({ count: count() })
          .from(conversations)
          .where(whereConditions);
        const total = totalResult[0]?.count || 0;

        // Get conversations with message stats for this workspace and user
        const data = await db
          .select(selectFields)
          .from(conversations)
          .where(whereConditions)
          .groupBy(conversations.id)
          .orderBy(orderFn(sortColumn), orderFn(conversations.id))
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
      schema: swaggerSchemas.getConversation,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const conversation = await db
          .select({
            id: conversations.id,
            title: conversations.title,
            metadata: conversations.metadata,
            agentId: conversations.agentId,
            workspaceSlug: conversations.workspaceSlug,
            userId: conversations.userId,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
          })
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          )
          .groupBy(conversations.id);

        if (!conversation.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }

        sendOkResponse(
          reply,
          ConversationWithStatsSchema,
          conversation[0],
          fastify.log
        );
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
    Querystring: { sortOrder?: string; agentId?: string };
  }>(
    '/conversations/:id/messages',
    {
      schema: swaggerSchemas.getMessages,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        // Check if conversation exists and user has access
        const conversationResults = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, id),
              eq(conversations.workspaceSlug, workspaceContext.slug),
              eq(conversations.userId, authContext.user.id)
            )
          )
          .limit(1);
        if (!conversationResults.length) {
          sendNotFoundError(reply, 'Conversation not found', fastify.log);
          return;
        }
        const conversation = conversationResults[0];
        // Find which agent is associated with the conversation
        const agentId = conversation.agentId;
        if (!agentId) {
          throw new Error('Conversation is not associated with an agent');
        }

        // Get the agent history
        const agentHistory = await agentsManager.getConversationHistory(
          agentId,
          conversation.id
        );

        // Serialize LangChain messages using their toJSON method
        // LangChain messages have a toDict() method that properly serializes them
        const serializedHistory = agentHistory
          .map((msg) => {
            if (typeof msg.toDict === 'function') {
              return msg.toDict();
            }
          })
          .filter((msg) => msg !== undefined);

        reply.status(200).send(serializedHistory);
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
  fastify.post<{ Body: ConversationRequest }>(
    '/conversations',
    {
      schema: swaggerSchemas.createConversation,
    },
    async (request, reply) => {
      try {
        const { title, metadata, agentId } = ConversationRequestSchema.parse(
          request.body
        );

        // Get workspace and user context from middleware
        const workspaceContext = request.workspace;
        const authContext = request.auth;

        if (!workspaceContext || !authContext) {
          throw new Error('Workspace and authentication context required');
        }

        const now = new Date();
        // Use ULID for time-ordered IDs (better B-tree index performance)
        const id = ulid(now.getTime());

        const newConversation = {
          id,
          title: title || titleGenerationService.createFallbackTitle(),
          metadata,
          agentId: agentId ?? null,
          workspaceSlug: workspaceContext.slug,
          userId: authContext.user.id,
          createdAt: now,
          updatedAt: now,
        } satisfies NewConversation;

        await db.insert(conversations).values(newConversation);

        // Log analytics
        analyticsService.logEvent({
          eventType: 'conversation_created',
          conversationId: id,
          eventData: {
            title,
            metadata,
            agentId,
          },
        });

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
  fastify.put<{ Params: ConversationParams; Body: ConversationRequest }>(
    '/conversations/:id',
    {
      schema: swaggerSchemas.updateConversation,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updateData = ConversationRequestSchema.parse(request.body);

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
        if (updateData.agentId !== undefined)
          updates.agentId = updateData.agentId ?? null;

        await db
          .update(conversations)
          .set(updates)
          .where(eq(conversations.id, id));

        // Log analytics
        analyticsService.logEvent({
          eventType: 'conversation_updated',
          conversationId: id,
          eventData: {
            title: updateData.title,
            metadata: updateData.metadata,
            agentId: updateData.agentId,
          },
        });

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

  // DELETE /api/conversations/:id - Delete conversation
  fastify.delete<{ Params: ConversationParams }>(
    '/conversations/:id',
    {
      schema: swaggerSchemas.deleteConversation,
    },
    async (request, reply) => {
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
        analyticsService.logEvent({
          eventType: 'conversation_deleted',
          conversationId: id,
          eventData: {
            title: conversation[0].title,
            metadata: conversation[0].metadata,
            agentId: conversation[0].agentId,
          },
        });

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
