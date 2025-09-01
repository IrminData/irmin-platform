import { z } from 'zod';

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

// Type exports
export type Message = z.infer<typeof MessageSchema>;
export type ChatRequest = {
  conversationId?: string;
  message: string;
  provider?: 'groq' | 'openai';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  toolSelection?: {
    includeServers?: string[];
    includeTools?: string[];
    excludeTools?: string[];
    includeAll?: boolean;
  };
  stream?: boolean;
};
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
