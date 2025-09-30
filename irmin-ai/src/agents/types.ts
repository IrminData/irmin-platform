import type { AIMessageChunk } from '@langchain/core/messages';

import type { LLMProvider } from '@/services/llm';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

import { type ToolSelection } from '@/types/agents';
import type { MessageBlock } from '@/types/blocks';

interface ContextRequirement {
  name: string;
  required: boolean;
  description: string;
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
  useAgentGraph: boolean;
  maxToolCalls: number;
}

export interface AgentInput {
  message: string;
  conversationId: string;
  context?: Record<string, unknown>;
  authToken?: string;
  metadata?: Record<string, unknown>;
  toolSelection?: ToolSelection;
  workspace: Workspace;
  user: User;
  messageHistoryLimit?: number;
}

export interface AgentResponse {
  content: string;
  blocks?: MessageBlock[];
  stream?: ReadableStream<AIMessageChunk>;
  metadata?: Record<string, unknown>;
  toolCalls?: unknown[];
  messages?: Array<{
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: unknown;
    messageType:
      | 'text'
      | 'tool_call'
      | 'tool_result'
      | 'reasoning'
      | 'source'
      | 'file'
      | 'error'
      | 'system'
      | null;
    blockId?: string | null;
    parentBlockId?: string | null;
    blockOrder: number | null;
    aiModelId?: string | null | undefined;
    modelProvider?: string | null | undefined;
    modelName?: string | null | undefined;
    inputTokens?: number | null | undefined;
    outputTokens?: number | null | undefined;
    totalTokens?: number | null | undefined;
    costUSD?: number | null | undefined;
    processingTimeMs?: number | null | undefined;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface BaseAgentInterface {
  config: AgentConfig;
  execute(input: AgentInput): Promise<AgentResponse>;
  validateInput(input: AgentInput): boolean;
  prepareContext(input: AgentInput): Promise<Record<string, unknown>>;
}
