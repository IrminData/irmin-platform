/* eslint-disable import-x/no-unused-modules */
import { z } from 'zod';

import {
  AIAgentSchema,
  AIConversationSchema,
  AIMessageSchema,
  AIModelSchema,
  AIUsageSchema,
} from './base';

// Response schemas
export const AIChatResponseSchema = z.object({
  conversationId: z.string(),
  messages: z.array(AIMessageSchema),
  usage: AIUsageSchema.optional(),
});

export const AIConversationsListResponseSchema = z.object({
  data: z.array(AIConversationSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const AIMessagesListResponseSchema = z.object({
  data: z.array(AIMessageSchema),
});

export const AIAgentsListResponseSchema = z.object({
  agents: z.array(AIAgentSchema),
});

export const AIAgentExecuteResponseSchema = z.object({
  content: z.string(),
  blocks: z.array(z.unknown()).optional(), // MessageBlockSchema from AI service
  stream: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  toolCalls: z.array(z.unknown()).optional(),
  messages: z.array(AIMessageSchema).optional(),
  // Additional fields that might be returned
  agentId: z.string().optional(),
  conversationId: z.string().optional(),
  usage: AIUsageSchema.optional(),
  processingTimeMs: z.number().optional(),
});

export const AIUserInfoResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    // Additional fields that might be present
    name: z.string().optional(),
    image_url: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
  }),
  token: z.string(),
});

export const AIWorkspaceInfoResponseSchema = z.object({
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    // Additional fields that might be present
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
  slug: z.string(),
});

export const AIModelsResponseSchema = z.object({
  models: z.array(AIModelSchema),
});

export const AIToolsResponseSchema = z.object({
  enabled: z.boolean(),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.string().optional(),
      schema: z.unknown().optional(),
      serverId: z.string().optional(),
      requiresAuth: z.boolean().optional(),
      // Legacy field for backward compatibility
      inputSchema: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  count: z.number(),
  servers: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['command', 'url']),
      requiresAuth: z.boolean(),
      toolCount: z.number(),
    })
  ),
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
