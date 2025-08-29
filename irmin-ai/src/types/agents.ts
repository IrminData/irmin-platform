import { z } from 'zod';

// Agent request schema
export const AgentRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.record(z.unknown()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Agent response schema
export const AgentResponseSchema = z.object({
  content: z.string(),
  stream: z.unknown().optional(),
  metadata: z
    .object({
      agentId: z.string(),
      type: z.string(),
      context: z.record(z.unknown()).optional(),
    })
    .optional(),
  toolCalls: z.array(z.unknown()).optional(),
  thinking: z.string().optional(),
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
      type: z.enum(['vector', 'database', 'api', 'memory', 'conversation']),
      name: z.string(),
      required: z.boolean(),
      config: z.record(z.unknown()).optional(),
    })
  ),
  thinkingEnabled: z.boolean(),
  useTools: z.boolean(),
  streaming: z.boolean(),
});

// Agent health response schema
export const AgentHealthResponseSchema = z.object({
  status: z.string(),
  agentsCount: z.number(),
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
    })
  ),
  mcp: z.object({
    enabled: z.boolean(),
    initialized: z.boolean(),
    toolCount: z.number(),
    toolNames: z.array(z.string()),
  }),
  modelsCount: z.number(),
});

// Type exports
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentHealthResponse = z.infer<typeof AgentHealthResponseSchema>;
