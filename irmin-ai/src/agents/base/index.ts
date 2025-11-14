import fs from 'fs/promises';
import { AgentMiddleware, BaseMessage, DynamicStructuredTool } from 'langchain';
import path from 'path';

import agentService from '@/services/agent';
import type { LLMOptions } from '@/services/llm';
import { systemPromptBuilder } from '@/services/systemPromptBuilder';

import type {
  AgentConfig,
  AgentInput,
  AgentResponse,
  BaseAgentInterface,
} from '@/agents/types';

export abstract class BaseAgent implements BaseAgentInterface {
  public config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Subclasses override this to specify LLM config, tools, and middleware
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getAgentOptions(_input: AgentInput): Promise<{
    llmOptions: LLMOptions;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    // Default: cheap Groq model as fallback
    return {
      llmOptions: {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      },
    };
  }

  /**
   * Subclasses can override to add custom context (e.g., vector search)
   */
  protected async prepareContext(
    input: AgentInput
  ): Promise<Record<string, unknown>> {
    return { ...input.context };
  }

  /**
   * Load system prompt from file
   */
  protected async loadSystemPrompt(): Promise<string> {
    try {
      const promptPath = path.join(
        process.cwd(),
        'src/agents',
        this.config.id,
        'system-prompt.txt'
      );
      return await fs.readFile(promptPath, 'utf-8');
    } catch {
      // Fallback to config-based prompt
      return `You are ${this.config.name}. ${this.config.description}`;
    }
  }

  /**
   * Validate input based on context requirements
   */
  validateInput(input: AgentInput): boolean {
    // Check message
    if (!input.message || input.message.trim() === '') {
      return false;
    }

    // Check context requirements
    for (const requirement of this.config.contextRequirements) {
      if (requirement.required && !input.context?.[requirement.name]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates a configured LangChain agent ready for execution
   */
  async createAgent(input: AgentInput, conversationId: string) {
    // 1. Validate input
    if (!this.validateInput(input)) {
      throw new Error('Invalid input for agent');
    }

    // 2. Get agent options from subclass
    const options = await this.getAgentOptions(input);

    // 3. Prepare context
    const context = await this.prepareContext(input);

    // 4. Build system prompt
    const basePrompt = await this.loadSystemPrompt();
    const systemPrompt = systemPromptBuilder.buildSystemPrompt(basePrompt, {
      user: input.user,
      workspace: input.workspace,
      conversationId,
      agentId: this.config.id,
      customContext: context,
    });

    // 5. Create LangChain agent via AgentService
    const agent = await agentService.getAgent({
      llmOptions: options.llmOptions,
      systemPrompt,
      tools: options.tools,
      middleware: options.middleware,
    });

    return agent;
  }

  /**
   * Main execute method - subclasses can override for custom behavior (e.g., streaming)
   */
  async execute(
    input: AgentInput,
    conversationId: string
  ): Promise<AgentResponse> {
    // Create the agent
    const agent = await this.createAgent(input, conversationId);

    // Invoke agent with thread_id = conversationId
    const result = await agentService.invokeAgent(
      agent,
      input.message,
      conversationId
    );

    // Extract content from result
    const messages = Array.isArray(result.messages) ? result.messages : [];

    // Return response
    return { messages };
  }

  /**
   * Get conversation history messages for a conversation
   */
  async getConversationHistory(conversationId: string): Promise<BaseMessage[]> {
    // Create a simple agent
    const agent = await agentService.getAgent({
      llmOptions: {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      },
      systemPrompt: `You are a helpful assistant.`,
      tools: [],
      middleware: [],
    });

    // Get the agent state from memory
    const agentState: unknown = await agentService.getAgentState(
      agent,
      conversationId
    );

    const messages: BaseMessage[] = [];
    if (
      typeof agentState === 'object' &&
      agentState !== null &&
      'values' in agentState &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (agentState as any).values === 'object' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (agentState as any).values !== null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((agentState as any).values.messages)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const message of (agentState as any).values.messages) {
        if (BaseMessage.isInstance(message)) {
          messages.push(message);
        }
      }
    }

    return messages;
  }
}
