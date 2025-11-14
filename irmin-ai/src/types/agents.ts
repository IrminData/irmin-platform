import { StoredMessage } from '@langchain/core/messages';
import { z } from 'zod';

// Agent request schema
export const AgentRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty'),
  context: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().optional(),
});

// Agent response schema
export const AgentResponseSchema = z.object({
  messages: z.array(z.custom<StoredMessage>()).optional(),
  conversationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
