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

// Agent request schema
export const AgentRequestSchema = z.object({
  message: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  toolSelection: ToolSelectionSchema.optional(),
  messageHistoryLimit: z.number().optional(),
});

// Agent response schema
export const AgentResponseSchema = z.object({
  content: z.string(),
  stream: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
      type: z.enum(['string', 'vector', 'memory', 'schema']),
      name: z.string(),
      required: z.boolean(),
      config: z.record(z.string(), z.unknown()).optional(),
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
export type ToolSelection = z.infer<typeof ToolSelectionSchema>;
