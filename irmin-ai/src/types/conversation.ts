import { z } from 'zod';

// Conversation base schema
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Conversation with message stats schema
export const ConversationWithStatsSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.unknown().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messageCount: z.number(),
  totalTokens: z.union([z.number(), z.string()]).nullable(),
  totalCost: z.union([z.number(), z.string()]).nullable(),
});

// Message schema
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.unknown().optional(),
  aiModelId: z.string().nullable(),
  modelProvider: z.string().nullable(),
  modelName: z.string().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
  costUSD: z.number().nullable(),
  processingTimeMs: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create conversation request schema
export const ConversationCreateRequestSchema = z.object({
  title: z.string().optional(),
  metadata: z.unknown().optional(),
});

// Update conversation request schema
export const ConversationUpdateRequestSchema = z.object({
  title: z.string().optional(),
  metadata: z.unknown().optional(),
});

// Conversation query parameters schema
export const ConversationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Conversation messages query parameters schema
export const ConversationMessagesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
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
export type Message = z.infer<typeof MessageSchema>;
export type ConversationCreateRequest = z.infer<
  typeof ConversationCreateRequestSchema
>;
export type ConversationUpdateRequest = z.infer<
  typeof ConversationUpdateRequestSchema
>;
export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;
export type ConversationMessagesQuery = z.infer<
  typeof ConversationMessagesQuerySchema
>;
export type PaginatedConversationsResponse = z.infer<
  typeof PaginatedConversationsResponseSchema
>;
export type PaginatedMessagesResponse = z.infer<
  typeof PaginatedMessagesResponseSchema
>;
