import { z } from 'zod';

// Shared block type definition
export const MessageBlockTypeSchema = z.enum([
  'text',
  'tool_call',
  'tool_result',
  'reasoning',
  'source',
  'file',
  'error',
  'system',
]);

export const MessageBlockSchema = z.object({
  id: z.string(),
  type: MessageBlockTypeSchema,
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  parentBlockId: z.string().optional(),
  order: z.number(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  sourceId: z.string().optional(),
  url: z.string().optional(),
});

// Type exports
export type MessageBlock = z.infer<typeof MessageBlockSchema>;
