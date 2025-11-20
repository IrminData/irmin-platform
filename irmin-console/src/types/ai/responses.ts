import type { StoredMessage } from '@langchain/core/messages';
import { z } from 'zod';

import { AIAgentSchema, AIConversationSchema, AIModelSchema } from './base';

// Response schemas
export const AIConversationsListResponseSchema = z.object({
  data: z.array(AIConversationSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const AIAgentsListResponseSchema = z.object({
  agents: z.array(AIAgentSchema),
});

export const AIAgentExecuteResponseSchema = z.object({
  messages: z.array(z.custom<StoredMessage>()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

// Type exports
export type AIConversationsListResponse = z.infer<
  typeof AIConversationsListResponseSchema
>;
export type AIAgentExecuteResponse = z.infer<
  typeof AIAgentExecuteResponseSchema
>;
