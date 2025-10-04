import { z } from 'zod';

import { MessageBlockSchema } from '@/types/blocks';

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

// Agent request schema
export const AgentRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty'),
  context: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  toolSelection: ToolSelectionSchema.optional(),
  messageHistoryLimit: z.number().optional(),
});

// Agent response schema
export const AgentResponseSchema = z.object({
  content: z.string(),
  blocks: z.array(MessageBlockSchema).optional(),
  stream: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  toolCalls: z.array(z.unknown()).optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        conversationId: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        metadata: z.unknown().optional(),
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
          .nullable()
          .default('text'),
        blockId: z.string().nullable().optional(),
        parentBlockId: z.string().nullable().optional(),
        blockOrder: z.number().nullable().default(0),
        aiModelId: z.string().nullable().optional(),
        modelProvider: z.string().nullable().optional(),
        modelName: z.string().nullable().optional(),
        inputTokens: z.number().nullable().optional(),
        outputTokens: z.number().nullable().optional(),
        totalTokens: z.number().nullable().optional(),
        costUSD: z.number().nullable().optional(),
        processingTimeMs: z.number().nullable().optional(),
        createdAt: z.date(),
        updatedAt: z.date(),
      })
    )
    .optional(),
});

// Context requirement schema
const ContextRequirementSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean(),
});

// Agent config schema
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['chat', 'single-shot']),
  modelProvider: z.enum(['groq', 'openai', 'anthropic']),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  responseFormat: z.enum(['structured', 'unstructured', 'json', 'markdown']),
  contextRequirements: z.array(ContextRequirementSchema),
  toolSelection: ToolSelectionSchema.optional(),
  streaming: z.boolean(),
});

// List agents response schema
export const ListAgentsResponseSchema = z.object({
  agents: z.array(AgentConfigSchema),
});

// Type exports
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type ToolSelection = z.infer<typeof ToolSelectionSchema>;
