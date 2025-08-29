import { z } from 'zod';

// Chat request schema
export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  provider: z.enum(['groq', 'openai']).default('groq'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  useTools: z.boolean().default(false),
  stream: z.boolean().default(true),
});

// Chat response schema
export const ChatResponseSchema = z.object({
  conversationId: z.string(),
  message: z.object({
    id: z.string(),
    conversationId: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.unknown()).optional(),
  }),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

// Models response schema
export const ModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      provider: z.string(),
      modelId: z.string(),
      description: z.string(),
      inputPricePerMillionTokens: z.number().nullable(),
      outputPricePerMillionTokens: z.number().nullable(),
    })
  ),
});

// Tools response schema
export const ToolsResponseSchema = z.object({
  enabled: z.boolean(),
  initialized: z.boolean(),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.string(),
    })
  ),
  count: z.number(),
  totalTools: z.number(),
});

// MCP status response schema
export const McpStatusResponseSchema = z.object({
  enabled: z.boolean(),
  initialized: z.boolean(),
  toolCount: z.number(),
  toolNames: z.array(z.string()),
  message: z.string(),
});

// Type exports
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
export type ToolsResponse = z.infer<typeof ToolsResponseSchema>;
export type McpStatusResponse = z.infer<typeof McpStatusResponseSchema>;
