import type { AIMessageChunk } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';

import type { LLMProvider } from '@/services/llm';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

import { type ToolSelection } from '@/types/agents';

interface ContextRequirement {
  type: 'string' | 'vector' | 'memory' | 'schema';
  name: string;
  required: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'single-shot';
  modelProvider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat: 'structured' | 'unstructured' | 'json' | 'markdown';
  contextRequirements: ContextRequirement[];
  toolSelection?: ToolSelection;
  streaming: boolean;
}

export interface AgentInput {
  message: string;
  context?: Record<string, unknown>;
  authToken?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  toolSelection?: ToolSelection;
  workspace: Workspace;
  user: User;
  messageHistoryLimit?: number;
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
