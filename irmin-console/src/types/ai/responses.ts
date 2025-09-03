/* eslint-disable import-x/no-unused-modules */
import { z } from 'zod';

import {
  AIAgentSchema,
  AIConversationSchema,
  AIMessageSchema,
  AIModelSchema,
  AIPaginationSchema,
  AIServerSchema,
  AIToolSchema,
  AIUsageSchema,
} from './base';

// Response schemas
export const AIChatResponseSchema = z.object({
  conversationId: z.string(),
  message: AIMessageSchema,
  usage: AIUsageSchema.optional(),
});

export const AIConversationsListResponseSchema = z.object({
  data: z.array(AIConversationSchema),
  pagination: AIPaginationSchema,
});

export const AIMessagesListResponseSchema = z.object({
  data: z.array(AIMessageSchema),
});

export const AIAgentsListResponseSchema = z.object({
  agents: z.array(AIAgentSchema),
});

export const AIAgentExecuteResponseSchema = z.object({
  content: z.string(),
  agentId: z.string(),
  conversationId: z.string(),
  usage: AIUsageSchema.optional(),
  processingTimeMs: z.number().optional(),
});

export const AIUserInfoResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
  }),
  token: z.string(),
});

export const AIWorkspaceInfoResponseSchema = z.object({
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  slug: z.string(),
});

export const AIModelsResponseSchema = z.object({
  models: z.array(AIModelSchema),
});

export const AIToolsResponseSchema = z.object({
  enabled: z.boolean(),
  tools: z.array(AIToolSchema),
  count: z.number(),
  servers: z.array(AIServerSchema),
  totalServers: z.number(),
});

// Type exports
export type AIChatResponse = z.infer<typeof AIChatResponseSchema>;
export type AIConversationsListResponse = z.infer<
  typeof AIConversationsListResponseSchema
>;
export type AIMessagesListResponse = z.infer<
  typeof AIMessagesListResponseSchema
>;
export type AIAgentsListResponse = z.infer<typeof AIAgentsListResponseSchema>;
export type AIAgentExecuteResponse = z.infer<
  typeof AIAgentExecuteResponseSchema
>;
export type AIUserInfoResponse = z.infer<typeof AIUserInfoResponseSchema>;
export type AIWorkspaceInfoResponse = z.infer<
  typeof AIWorkspaceInfoResponseSchema
>;
export type AIModelsResponse = z.infer<typeof AIModelsResponseSchema>;
export type AIToolsResponse = z.infer<typeof AIToolsResponseSchema>;
