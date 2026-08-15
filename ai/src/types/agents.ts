import { z } from 'zod';

// Agent request schema
export const AgentRequestSchema = z.object({
  message: z
    .string()
    .max(35_000, 'Message exceeds the 35000 character limit')
    .refine((message) => message.trim().length > 0, 'Message cannot be empty'),
  context: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().optional(),
});

// Agent response schema
export const AgentResponseSchema = z.object({
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  specialistResult: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('sql'), sql: z.string() }),
      z.object({ kind: z.literal('go'), code: z.string() }),
      z.object({ kind: z.literal('clarification'), message: z.string() }),
    ])
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
  supportsStreaming: z.boolean(),
  contextRequirements: z.array(ContextRequirementSchema),
});

// List agents response schema
export const ListAgentsResponseSchema = z.object({
  agents: z.array(AgentConfigSchema),
});

// Type exports
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
