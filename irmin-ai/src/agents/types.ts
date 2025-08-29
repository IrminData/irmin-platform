import type { AIMessageChunk } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';

import type { LLMProvider } from '@/services/llm';

export type AgentType = 'chat' | 'single-shot';
export type ResponseFormat =
  | 'structured'
  | 'unstructured'
  | 'json'
  | 'markdown';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  modelProvider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat: ResponseFormat;
  contextRequirements: ContextRequirement[];
  useTools: boolean;
  streaming: boolean;
}

export interface ContextRequirement {
  type: 'string' | 'vector' | 'memory' | 'conversation' | 'schema';
  name: string;
  required: boolean;
  config?: Record<string, unknown>;
}

export interface AgentInput {
  message: string;
  context?: Record<string, unknown>;
  authToken?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  content: string;
  stream?: IterableReadableStream<AIMessageChunk>;
  metadata?: Record<string, unknown>;
  toolCalls?: unknown[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface BaseAgentInterface {
  config: AgentConfig;
  execute(input: AgentInput): Promise<AgentResponse>;
  validateInput(input: AgentInput): boolean;
  prepareContext(input: AgentInput): Promise<Record<string, unknown>>;
}
