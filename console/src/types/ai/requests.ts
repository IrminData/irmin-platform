import { z } from 'zod';

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
  message: z.string().trim().min(1, 'Message cannot be empty'),
  context: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().optional(),
});

// Type exports
export type AICreateConversationRequest = z.infer<
  typeof AICreateConversationRequestSchema
>;
export type AIUpdateConversationRequest = z.infer<
  typeof AIUpdateConversationRequestSchema
>;
export type AIAgentExecuteRequest = z.infer<typeof AIAgentExecuteRequestSchema>;
