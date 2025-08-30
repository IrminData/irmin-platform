import { z } from 'zod';

import { ToolSelectionSchema } from './chat';

// Agent request schema
export const AgentRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.record(z.unknown()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  toolSelection: ToolSelectionSchema.optional(),
});

// Agent response schema
export const AgentResponseSchema = z.object({
  content: z.string(),
  stream: z.unknown().optional(),
  metadata: z.record(z.unknown()).optional(),
  toolCalls: z.array(z.unknown()).optional(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

// Agent config schema
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['chat', 'single-shot']),
  modelProvider: z.enum(['groq', 'openai']),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  responseFormat: z.enum(['structured', 'unstructured', 'json', 'markdown']),
  contextRequirements: z.array(
    z.object({
      type: z.enum(['string', 'vector', 'memory', 'conversation', 'schema']),
      name: z.string(),
      required: z.boolean(),
      config: z.record(z.unknown()).optional(),
    })
  ),
  toolSelection: ToolSelectionSchema.optional(),
  streaming: z.boolean(),
});

// List agents response schema
export const ListAgentsResponseSchema = z.object({
  agents: z.array(AgentConfigSchema),
});

// Type exports
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ListAgentsResponse = z.infer<typeof ListAgentsResponseSchema>;
