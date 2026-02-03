import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import type { BaseMessage } from 'langchain';

import type agentService from '@/services/agent';
import type { DOC_SETS, DocFile } from '@/services/staticDocs';

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
  /**
   * Static documentation to inject into agent context.
   * Can be a predefined doc set name or an array of specific doc files.
   * This avoids the ~1.5s embedding latency of vector retrieval.
   */
  staticDocs?: keyof typeof DOC_SETS | DocFile[];
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
