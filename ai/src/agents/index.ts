import { agentRunner } from '@/agent-runtime/agentRunner';
import {
  type Conversation,
  conversationStore,
} from '@/agent-runtime/conversationStore';
import { BaseMessage } from 'langchain';

import { AssistantAgent } from '@/agents/assistant';
import { QueryAgent } from '@/agents/query';
import { ScriptingAgent } from '@/agents/scripting';
import {
  AgentConfig,
  AgentInput,
  AgentResponse,
  BaseAgentInterface,
} from '@/agents/types';

export class AgentsManager {
  private agents: Map<string, BaseAgentInterface> = new Map();

  constructor() {
    this.registerAgent(new AssistantAgent());
    this.registerAgent(new QueryAgent());
    this.registerAgent(new ScriptingAgent());
  }

  private registerAgent(agent: BaseAgentInterface): void {
    this.agents.set(agent.config.id, agent);
  }

  /**
   * Get or create a conversation for agent execution.
   * This is extracted to allow getting the conversation ID before streaming starts,
   * so we can include it in HTTP headers.
   */
  async getOrCreateConversation(
    agentId: string,
    input: AgentInput
  ): Promise<{ conversation: Conversation }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.validateInput(input)) {
      throw new Error('Invalid input for agent');
    }

    if (!input.workspace || !input.user) {
      throw new Error(
        'Workspace and user context required for agent execution'
      );
    }

    return {
      conversation: await conversationStore.getOrCreate(agentId, input),
    };
  }

  /**
   * Execute an agent with the given input.
   * Optionally accepts a pre-created conversation (from getOrCreateConversation)
   * to avoid duplicate DB calls when the conversation ID is needed before execution.
   */
  async executeAgent(
    agentId: string,
    input: AgentInput,
    existingConversation?: Conversation
  ): Promise<{
    agentResponse: AgentResponse;
    conversationId: string;
    normalizedMessage: string;
  }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.validateInput(input)) {
      throw new Error('Invalid input for agent');
    }

    if (!input.workspace || !input.user) {
      throw new Error(
        'Workspace and user context required for agent execution'
      );
    }

    // Use existing conversation or create/get one
    const conversation =
      existingConversation ||
      (await this.getOrCreateConversation(agentId, input)).conversation;

    const { response, normalizedMessage } = await agentRunner.run(
      agent,
      input,
      conversation
    );

    // Add conversation ID to response metadata
    const agentResponse: AgentResponse = {
      ...response,
      conversationId: conversation.id,
    };

    return {
      agentResponse,
      conversationId: conversation.id,
      normalizedMessage,
    };
  }

  async getConversationHistory(
    agentId: string,
    conversationId: string
  ): Promise<BaseMessage[]> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return agent.getConversationHistory(conversationId);
  }

  /** Delete relational metadata and its checkpointed LangGraph thread. */
  async deleteConversation(conversationId: string): Promise<void> {
    await conversationStore.delete(conversationId);
  }

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId)?.config;
  }

  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map((agent) => agent.config);
  }
}
