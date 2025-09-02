import { z } from 'zod';

import { ToolSelectionSchema } from './agents';

// Chat request schema
export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string(),
  provider: z.enum(['groq', 'openai']).optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  toolSelection: ToolSelectionSchema.optional(),
  stream: z.boolean().optional(),
});

// Shared message schema
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

// Chat response schema
export const ChatResponseSchema = z.object({
  conversationId: z.string(),
  message: MessageSchema,
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

// Type exports - keep ChatRequest as it's used in route handlers
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
