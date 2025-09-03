import { z } from 'zod';

import { AIToolSelectionSchema } from './base';

export const AIChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  provider: z.enum(['groq', 'openai']).default('groq').optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  toolSelection: AIToolSelectionSchema.optional(),
  stream: z.boolean().default(true).optional(),
});

export const AICreateConversationRequestSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  agentId: z.string().optional(),
});

export const AIUpdateConversationRequestSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  agentId: z.string().optional(),
});

export const AIAgentExecuteRequestSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.string(), z.any()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  messageHistoryLimit: z.number().default(20).optional(),
  toolSelection: AIToolSelectionSchema.optional(),
});

// Type exports
export type AIChatRequest = z.infer<typeof AIChatRequestSchema>;
export type AICreateConversationRequest = z.infer<
  typeof AICreateConversationRequestSchema
>;
export type AIUpdateConversationRequest = z.infer<
  typeof AIUpdateConversationRequestSchema
>;
export type AIAgentExecuteRequest = z.infer<typeof AIAgentExecuteRequestSchema>;
