import { z } from 'zod';

// Tool selection schema - allows specifying which tools to include
export const ToolSelectionSchema = z.object({
  // Include all tools from specific MCP servers
  includeServers: z
    .array(z.string())
    .optional()
    .describe('Include all tools from specific MCP servers'),
  // Include specific tools by name
  includeTools: z
    .array(z.string())
    .optional()
    .describe('Include specific tools by name'),
  // Exclude specific tools by name
  excludeTools: z
    .array(z.string())
    .optional()
    .describe('Exclude specific tools by name'),
  // Include all available tools (legacy behavior)
  includeAll: z
    .boolean()
    .optional()
    .describe('Include all available tools (legacy behavior)'),
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

// Chat request schema
export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  provider: z.enum(['groq', 'openai']).default('groq'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  toolSelection: ToolSelectionSchema.optional(),
  stream: z.boolean().default(true),
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

// MCP tools response schema - detailed tool information
export const McpToolsResponseSchema = z.object({
  enabled: z.boolean(),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.string(),
      schema: z.unknown().optional(),
      serverId: z.string().optional(),
      requiresAuth: z.boolean().optional(),
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
export type ToolSelection = z.infer<typeof ToolSelectionSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
export type McpToolsResponse = z.infer<typeof McpToolsResponseSchema>;
