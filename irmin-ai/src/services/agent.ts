import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import {
  type AgentMiddleware,
  createAgent,
  type CreateAgentParams,
  type DynamicStructuredTool,
} from 'langchain';

import { env } from '@/config/env';

import { type LLMOptions, llmService } from './llm';

interface AgentOptions {
  llmOptions: LLMOptions;
  systemPrompt: string;
  tools?: DynamicStructuredTool[];
  middleware?: AgentMiddleware[];
  langchainAgentOptions?: CreateAgentParams;
}

class AgentService {
  private postgresSaver?: PostgresSaver;

  async configurePostgresSaver() {
    this.postgresSaver = PostgresSaver.fromConnString(env.DATABASE_URL);
    await this.postgresSaver.setup();
  }

  async getAgent(options: AgentOptions) {
    if (!this.postgresSaver) {
      await this.configurePostgresSaver();
    }
    const model = llmService.createLLM(options.llmOptions);
    const tools = options.tools || [];
    const agent = createAgent({
      model,
      tools,
      middleware: options.middleware || [],
      systemPrompt: options.systemPrompt,
      checkpointer: this.postgresSaver,
      ...options.langchainAgentOptions,
    });
    return agent;
  }

  async getAgentState(
    agent: Awaited<ReturnType<typeof this.getAgent>>,
    conversationId: string
  ) {
    return agent.getState({
      configurable: { thread_id: conversationId },
    });
  }

  async invokeAgent(
    agent: Awaited<ReturnType<typeof this.getAgent>>,
    message: string,
    conversationId?: string
  ) {
    // Invoke agent with thread_id = conversationId
    return agent.invoke(
      { messages: [{ role: 'user', content: message }] },
      { configurable: { thread_id: conversationId } }
    );
  }

  async streamAgent(
    agent: Awaited<ReturnType<typeof this.getAgent>>,
    message: string,
    conversationId?: string
  ) {
    return agent.streamEvents(
      { messages: [{ role: 'user', content: message }] },
      { configurable: { thread_id: conversationId }, version: 'v2' }
    );
  }
}

export default new AgentService();
