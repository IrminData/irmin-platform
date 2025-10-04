import { z } from 'zod';

import { MessageBlockTypeSchema } from '@/types/blocks';

import { ToolSelectionSchema } from './agents';

// Chat request schema
export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, 'Message cannot be empty'),
  provider: z.enum(['groq', 'openai']).optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  toolSelection: ToolSelectionSchema.optional(),
  stream: z.boolean().optional(),
  messageHistoryLimit: z.number().optional(),
});

// Shared message schema
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.unknown().optional(),

  // Message block structure
  messageType: MessageBlockTypeSchema.nullable().default('text'),
  blockId: z.string().nullable().optional(),
  parentBlockId: z.string().nullable().optional(),
  blockOrder: z.number().nullable().default(0),

  // AI model information
  aiModelId: z.string().nullable(),
  modelProvider: z.string().nullable(),
  modelName: z.string().nullable(),

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

// Chat response schema
export const ChatResponseSchema = z.object({
  conversationId: z.string(),
  messages: z.array(MessageSchema),
});

// Type exports - keep ChatRequest as it's used in route handlers
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
