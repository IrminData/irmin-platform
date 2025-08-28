import { z } from 'zod';

// Conversation schema
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// Conversation create request schema
export const ConversationCreateRequestSchema = z.object({
  title: z.string().optional(),
  initialMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Conversation update request schema
export const ConversationUpdateRequestSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Type exports
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationCreateRequest = z.infer<typeof ConversationCreateRequestSchema>;
export type ConversationUpdateRequest = z.infer<typeof ConversationUpdateRequestSchema>;
