import type { Message } from '@/database';
import { db, messages as messagesTable } from '@/database';
import { desc, eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

import { completionService } from '@/services/completion';
import { systemPromptBuilder } from '@/services/systemPromptBuilder';

import {
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

  async execute(input: AgentInput): Promise<AgentResponse> {
    // Validate input
    if (!this.validateInput(input)) {
      throw new Error('Invalid input for agent');
    }

    // Prepare context and messages
    const context = await this.prepareContext(input);
    const conversationMessages = await this.buildMessages(input);
    const baseSystemPrompt = await this.loadSystemPrompt();

    // Build system prompt with context using the system prompt builder
    // Convert AgentInput types to SystemPromptBuilder types
    const systemPrompt = systemPromptBuilder.buildSystemPrompt(
      baseSystemPrompt,
      {
        user: input.user,
        workspace: input.workspace,
        conversationId: input.conversationId,
        agentId: this.config.id,
        customContext: context,
      }
    );

    // Check if this is a streaming request based on input metadata and agent ability to stream
    // If metadata.streaming is explicitly set to false, respect that even if agent supports streaming
    const isStreamingRequest =
      input.metadata?.streaming !== false && // Allow streaming unless explicitly disabled
      this.config.streaming; // Agent must support streaming

    // Execute with the completion service
    if (isStreamingRequest) {
      const stream = await completionService.createStreamingResponse({
        messages: conversationMessages,
        provider: this.config.modelProvider,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        useAgentGraph: this.config.useAgentGraph,
        maxToolCalls: this.config.maxToolCalls,
        systemPrompt,
        toolSelection: input.toolSelection || this.config.toolSelection,
        authToken: input.authToken,
        conversationId: input.conversationId,
      });

      return {
        content: '', // Content will be streamed
        stream: stream, // Pass LangChain stream directly
        metadata: {
          agentId: this.config.id,
          type: this.config.type,
          context,
        },
      };
    } else {
      const response = await completionService.createResponse({
        messages: conversationMessages,
        provider: this.config.modelProvider,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        useAgentGraph: this.config.useAgentGraph,
        maxToolCalls: this.config.maxToolCalls,
        systemPrompt,
        toolSelection: input.toolSelection || this.config.toolSelection,
        authToken: input.authToken,
        conversationId: input.conversationId,
      });

      return {
        content: response.content,
        blocks: response.blocks,
        metadata: {
          agentId: this.config.id,
          type: this.config.type,
          context,
        },
      };
    }
  }

  validateInput(input: AgentInput): boolean {
    if (!input.message || input.message.trim() === '') {
      return false;
    }

    // Make sure that all required context is provided by the user
    for (const requirement of this.config.contextRequirements) {
      if (requirement.required && !input.context?.[requirement.name]) {
        // If the context is required, and the user has not provided it, fail the validation
        return false;
      }
    }

    // Make sure that the input only contains valid context
    if (input.context) {
      for (const inputContextKey of Object.keys(input.context)) {
        if (
          !this.config.contextRequirements.some(
            (requirement) => requirement.name === inputContextKey
          )
        ) {
          // If the context is not a valid context, fail the validation
          return false;
        }
      }
    }

    return true;
  }

  async prepareContext(input: AgentInput): Promise<Record<string, unknown>> {
    // Simply pass the input context through
    const context: Record<string, unknown> = { ...input.context };
    return context;
  }

  protected async buildMessages(input: AgentInput): Promise<Message[]> {
    const conversationMessages: Message[] = [];

    // Fetch conversation history if conversationId is provided
    if (input.conversationId) {
      const history = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, input.conversationId))
        .orderBy(desc(messagesTable.createdAt))
        .limit(input.messageHistoryLimit || 20);

      // Reverse to get chronological order
      conversationMessages.push(...history.reverse());
    }

    return conversationMessages;
  }

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
      console.warn(
        `No system prompt found for ${this.config.id}, using default`
      );
      return `You are ${this.config.name}. ${this.config.description}`;
    }
  }

  /**
   * Determine if this agent should use the agent graph for iterative tool calling
   * By default, use agent graph if tools are available
   */
  protected shouldUseAgentGraph(input: AgentInput): boolean {
    const hasTools = !!(input.toolSelection || this.config.toolSelection);
    return hasTools;
  }
}
