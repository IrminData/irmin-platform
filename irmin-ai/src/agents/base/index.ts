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
import { ContextManager } from '@/agents/utils/context-manager';

export abstract class BaseAgent implements BaseAgentInterface {
  public config: AgentConfig;
  protected contextManager: ContextManager;

  constructor(config: AgentConfig) {
    this.config = config;
    this.contextManager = new ContextManager();
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
    const isStreamingRequest =
      input.metadata?.streaming === true && this.config.streaming;

    // Execute with the completion service
    if (isStreamingRequest) {
      const stream = await completionService.createStreamingResponse({
        messages: conversationMessages,
        provider: this.config.modelProvider,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        systemPrompt,
        toolSelection: input.toolSelection || this.config.toolSelection,
        authToken: input.authToken,
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
        systemPrompt,
        toolSelection: input.toolSelection || this.config.toolSelection,
        authToken: input.authToken,
      });

      return {
        content: response.content,
        usage: response.usage,
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

    // Check required context that must be provided by the user
    for (const requirement of this.config.contextRequirements) {
      if (requirement.required && !input.context?.[requirement.name]) {
        // For context types that can be prepared automatically, allow them to pass
        // even if the implementation is not yet complete
        if (['schema', 'vector', 'memory'].includes(requirement.type)) {
          // Allow these context types to be prepared automatically
          continue;
        }
        return false;
      }
    }

    return true;
  }

  async prepareContext(input: AgentInput): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = { ...input.context };

    for (const requirement of this.config.contextRequirements) {
      switch (requirement.type) {
        case 'string':
          context[requirement.name] = input.context?.[requirement.name] || '';
          break;
        case 'vector':
          context[requirement.name] =
            await this.contextManager.getVectorContext(
              requirement.name,
              input.message
            );
          break;
        case 'memory':
          context[requirement.name] =
            await this.contextManager.getMemoryContext(input.conversationId);
          break;
        case 'schema':
          context[requirement.name] =
            await this.contextManager.getSchemaContext();
          break;
        // Add other context types as needed
      }
    }

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
}
