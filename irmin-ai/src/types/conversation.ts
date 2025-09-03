import { z } from 'zod';

import { MessageSchema } from './chat';

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
  messageCount: z.number(),
  totalTokens: z.union([z.number(), z.string()]).nullable(),
  totalCost: z.union([z.number(), z.string()]).nullable(),
});

// Paginated conversations response schema
export const PaginatedConversationsResponseSchema = z.object({
  data: z.array(ConversationWithStatsSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Messages response schema (non-paginated)
export const MessagesResponseSchema = z.object({
  data: z.array(MessageSchema),
});

// Type exports
export type ConversationRequest = z.infer<typeof ConversationRequestSchema>;
