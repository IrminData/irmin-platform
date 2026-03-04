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
  private postgresSaverPromise?: Promise<PostgresSaver>;

  async configurePostgresSaver(): Promise<PostgresSaver> {
    // Use a stored promise to prevent duplicate initialization from concurrent calls.
    // On failure the promise is cleared so that the next call retries instead of
    // permanently returning the cached rejection (transient DB errors should be recoverable).
    if (!this.postgresSaverPromise) {
      this.postgresSaverPromise = (async () => {
        const saver = PostgresSaver.fromConnString(env.DATABASE_URL);
        await saver.setup();
        this.postgresSaver = saver;
        return saver;
      })().catch((err) => {
        this.postgresSaverPromise = undefined;
        throw err;
      });
    }
    return this.postgresSaverPromise;
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
