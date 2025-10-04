import { z } from 'zod';

// Message schema based on database schema
const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.unknown().optional(),

  // Message block structure
  messageType: z
    .enum([
      'text',
      'tool_call',
      'tool_result',
      'reasoning',
      'source',
      'file',
      'error',
      'system',
    ])
    .nullable()
    .default('text'),
  blockId: z.string().nullable().optional(),
  parentBlockId: z.string().nullable().optional(),
  blockOrder: z.number().nullable().default(0),

  // AI model information
  aiModelId: z.string().nullable(),
  modelProvider: z.string().nullable(),
  modelName: z.string().nullable(),

  // Agent information
  agentName: z.string().nullable(),

  // Token usage and costs
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
  costUSD: z.number().nullable(),

  // Performance metrics
  processingTimeMs: z.number().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

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
