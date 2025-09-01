import { z } from 'zod';

import { MessageSchema } from './chat';

// Conversation schema
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Conversation with stats schema
const ConversationWithStatsSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.unknown().optional(),
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

// Paginated messages response schema
export const PaginatedMessagesResponseSchema = z.object({
  data: z.array(MessageSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Type exports
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationWithStats = z.infer<typeof ConversationWithStatsSchema>;
export type ConversationCreateRequest = {
  title?: string;
  metadata?: unknown;
};
export type ConversationUpdateRequest = {
  title?: string;
  metadata?: unknown;
};
export type PaginatedConversationsResponse = z.infer<
  typeof PaginatedConversationsResponseSchema
>;
export type PaginatedMessagesResponse = z.infer<
  typeof PaginatedMessagesResponseSchema
>;
