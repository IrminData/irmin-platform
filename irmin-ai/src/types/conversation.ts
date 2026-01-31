import { z } from 'zod';

// Conversation request schema
export const ConversationRequestSchema = z.object({
  title: z.string().optional(),
  metadata: z.unknown().optional(),
  agentId: z.string().optional(),
});

// Conversation schema
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.unknown().optional(),
  agentId: z.string().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Conversation with stats schema
export const ConversationWithStatsSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.unknown().optional(),
  agentId: z.string().nullable(),
  workspaceSlug: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Paginated conversations response schema (offset-based)
export const PaginatedConversationsResponseSchema = z.object({
  data: z.array(ConversationWithStatsSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Cursor-paginated conversations response schema
export const CursorPaginatedConversationsResponseSchema = z.object({
  data: z.array(ConversationWithStatsSchema),
  pagination: z.object({
    limit: z.number(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

// Type exports
export type ConversationRequest = z.infer<typeof ConversationRequestSchema>;
/** Exported for API consumers to type their responses @public */
export type CursorPaginatedConversationsResponse = z.infer<
  typeof CursorPaginatedConversationsResponseSchema
>;
