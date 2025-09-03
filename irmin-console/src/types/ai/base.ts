import { z } from 'zod';

export const AIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});

export const AIPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const AIMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  aiModelId: z.string().nullable().optional(),
  modelProvider: z.string().nullable().optional(),
  modelName: z.string().nullable().optional(),
  inputTokens: z.number().nullable().optional(),
  outputTokens: z.number().nullable().optional(),
  totalTokens: z.number().nullable().optional(),
  costUSD: z.number().nullable().optional(),
  processingTimeMs: z.number().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AIConversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  agentId: z.string().nullable().optional(),
  workspaceSlug: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  messageCount: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
});

export const AIUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

export const AIToolSelectionSchema = z.object({
  includeAll: z.boolean().optional(),
  includeTools: z.array(z.string()).optional(),
  excludeTools: z.array(z.string()).optional(),
});

export const AIAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['chat', 'single-shot']),
  capabilities: z.array(z.string()),
  systemPrompt: z.string(),
  defaultModel: z.string(),
  defaultProvider: z.string(),
  supportsMCP: z.boolean(),
  supportsStreaming: z.boolean(),
});

export const AIModelSchema = z.object({
  name: z.string(),
  provider: z.string(),
  modelId: z.string(),
  description: z.string(),
  inputPricePerMillionTokens: z.number(),
  outputPricePerMillionTokens: z.number(),
});

export const AIToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.any()),
});

export const AIServerSchema = z.object({
  name: z.string(),
  version: z.string(),
});

// Type exports
export type AIMessage = z.infer<typeof AIMessageSchema>;
export type AIConversation = z.infer<typeof AIConversationSchema>;
export type AIAgent = z.infer<typeof AIAgentSchema>;
