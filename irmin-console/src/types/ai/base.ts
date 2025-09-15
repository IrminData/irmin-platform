import { z } from 'zod';

export const AIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});

export const AIMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),

  // Message block structure
  messageType: z
    .enum([
      'text',
      'tool_call',
      'tool_result',
      'reasoning',
      'source',
      'file',
      'error',
      'system',
    ])
    .default('text')
    .nullable(),
  blockId: z.string().nullable().optional(),
  parentBlockId: z.string().nullable().optional(),
  blockOrder: z.number().default(0).nullable(),

  // AI model information
  aiModelId: z.string().nullable().optional(),
  modelProvider: z.string().nullable().optional(),
  modelName: z.string().nullable().optional(),

  // Agent information
  agentName: z.string().nullable().optional(),

  // Token usage and costs
  inputTokens: z.number().default(0).nullable(),
  outputTokens: z.number().default(0).nullable(),
  totalTokens: z.number().default(0).nullable(),
  costUSD: z.number().default(0).nullable(),

  // Performance metrics
  processingTimeMs: z.number().default(0).nullable(),

  // Timestamps - accept any string and transform to Date
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AIConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  agentId: z.string().nullable().optional(),
  workspaceSlug: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  messageCount: z.number().optional(),
  totalTokens: z.union([z.number(), z.string()]).nullable().optional(),
  totalCost: z.union([z.number(), z.string()]).nullable().optional(),
});

export const AIUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

export const AIToolSelectionSchema = z.object({
  includeServers: z
    .array(z.string())
    .optional()
    .describe('Include all tools from specific MCP servers'),
  includeTools: z
    .array(z.string())
    .optional()
    .describe('Include specific tools by name'),
  excludeTools: z
    .array(z.string())
    .optional()
    .describe('Exclude specific tools by name'),
  includeAll: z
    .boolean()
    .optional()
    .describe('Include all available tools (legacy behavior)'),
});

export const AIAgentSchema = z.object({
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
      type: z.enum(['string', 'vector', 'memory', 'schema']),
      name: z.string(),
      required: z.boolean(),
      config: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  toolSelection: AIToolSelectionSchema.optional(),
  streaming: z.boolean(),
  // Legacy fields for backward compatibility
  capabilities: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  defaultModel: z.string().optional(),
  defaultProvider: z.string().optional(),
  supportsMCP: z.boolean().optional(),
  supportsStreaming: z.boolean().optional(),
});

export const AIModelSchema = z.object({
  name: z.string(),
  provider: z.string(),
  modelId: z.string(),
  description: z.string(),
  inputPricePerMillionTokens: z.number().nullable(),
  outputPricePerMillionTokens: z.number().nullable(),
});

// Type exports
export type AIMessage = z.infer<typeof AIMessageSchema>;
export type AIConversation = z.infer<typeof AIConversationSchema>;
export type AIAgent = z.infer<typeof AIAgentSchema>;
