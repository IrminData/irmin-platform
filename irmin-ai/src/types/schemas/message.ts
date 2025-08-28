import { z } from 'zod';

// Enhanced Message schema with AI tracking
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  
  // AI-specific fields
  aiModelId: z.string().optional(),
  systemPromptId: z.string().optional(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  processingTimeMs: z.number().int().min(0).optional(),
  costDollars: z.number().min(0).optional(),
  
  // LLM parameters
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  
  // Context tracking
  contextMessages: z.array(z.string()).optional(), // Array of message IDs
  parentMessageId: z.string().optional(),
  
  // Error tracking
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
  
  metadata: z.record(z.unknown()).optional(),
});

// Enhanced Message create request schema
export const MessageCreateRequestSchema = z.object({
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  
  // AI-specific fields
  aiModelId: z.string().optional(),
  systemPromptId: z.string().optional(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  processingTimeMs: z.number().int().min(0).optional(),
  costDollars: z.number().min(0).optional(),
  
  // LLM parameters
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  
  // Context tracking
  contextMessages: z.array(z.string()).optional(),
  parentMessageId: z.string().optional(),
  
  // Error tracking
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
  
  metadata: z.record(z.unknown()).optional(),
});

// AI Model schema
export const AIModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  modelVersion: z.string().optional(),
  description: z.string().optional(),
  costPerInputToken: z.number().min(0).optional(),
  costPerOutputToken: z.number().min(0).optional(),
  maxContextLength: z.number().int().min(1).optional(),
  supportsStreaming: z.boolean().default(true),
  supportsFunctionCalling: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
});

// Type exports
export type Message = z.infer<typeof MessageSchema>;
export type MessageCreateRequest = z.infer<typeof MessageCreateRequestSchema>;
export type AIModel = z.infer<typeof AIModelSchema>;
