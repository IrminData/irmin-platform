import type { BaseMessage } from 'langchain';
import { StreamEvent } from 'node_modules/@langchain/core/dist/tracers/event_stream';
import { IterableReadableStream } from 'node_modules/@langchain/openai/dist/langchain-core/dist/utils/stream';

import type agentService from '@/services/agent';

import type { User } from '@/irmin-api/types/user';
import type { Workspace } from '@/irmin-api/types/workspace';

interface ContextRequirement {
  name: string;
  required: boolean;
  description: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  supportsStreaming: boolean;
  contextRequirements: ContextRequirement[];
}

export interface AgentInput {
  message: string;
  conversationId?: string;
  context?: Record<string, unknown>;
  authToken?: string;
  workspace: Workspace;
  user: User;
}

export interface AgentResponse {
  messages?: BaseMessage[];
  stream?: IterableReadableStream<StreamEvent>;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface BaseAgentInterface {
  config: AgentConfig;
  createAgent(
    input: AgentInput,
    conversationId: string
  ): Promise<Awaited<ReturnType<typeof agentService.getAgent>>>;
  execute(input: AgentInput, conversationId: string): Promise<AgentResponse>;
  validateInput(input: AgentInput): boolean;
  getConversationHistory(conversationId: string): Promise<BaseMessage[]>;
}
