import { ChatAgent } from '@/agents/chat';
import { QueryAgent } from '@/agents/query';
import { ScriptingAgent } from '@/agents/scripting';
import { TitleGenerationAgent } from '@/agents/title-generation';
import {
  AgentConfig,
  AgentInput,
  AgentResponse,
  BaseAgentInterface,
} from '@/agents/types';
import { conversations, db, messages, type NewMessage } from '@/database';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

import { analyticsService } from '@/services/analytics';
import { completionService } from '@/services/completion';
import { llmService } from '@/services/llm';

export class AgentsManager {
  private agents: Map<string, BaseAgentInterface> = new Map();

  constructor() {
    this.registerAgent(new ChatAgent());
    this.registerAgent(new QueryAgent());
    this.registerAgent(new ScriptingAgent());
    this.registerAgent(new TitleGenerationAgent());
  }

  private registerAgent(agent: BaseAgentInterface): void {
    this.agents.set(agent.config.id, agent);
  }

  async executeAgent(
    agentId: string,
    input: AgentInput
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      // Log error analytics
      await analyticsService.logError(
        'agent_execution',
        `Agent ${agentId} not found`,
        input.conversationId,
        undefined
      );
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.validateInput(input)) {
      // Log error analytics
      await analyticsService.logError(
        'agent_execution',
        'Invalid input for agent',
        input.conversationId,
        undefined
      );
      throw new Error('Invalid input for agent');
    }

    let conversation: typeof conversations.$inferSelect;
    const startTime = Date.now();

    try {
      // Create or get existing conversation
      if (input.conversationId) {
        const existingConversation = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.conversationId));
        if (!existingConversation.length) {
          throw new Error('Conversation not found');
        }
        conversation = existingConversation[0];
      } else {
        // Create new conversation
        const id = randomUUID();
        const now = new Date();
        const newConversation = {
          id,
          title:
            input.message.substring(0, 50) +
            (input.message.length > 50 ? '...' : ''),
          metadata: {},
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(conversations).values(newConversation);
        conversation = newConversation;

        // Log analytics
        await analyticsService.logConversationEvent('conversation_created', id);
      }

      // Save user message
      const userMessageId = randomUUID();
      const now = new Date();
      const userMessage: NewMessage = {
        id: userMessageId,
        conversationId: conversation.id,
        role: 'user',
        content: input.message,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(messages).values(userMessage);

      // Log user message analytics
      await analyticsService.logMessageSent(conversation.id, userMessageId);

      // Execute agent
      const response = await agent.execute(input);
      const processingTimeMs = Date.now() - startTime;

      // Calculate cost for agent execution
      let costUSD = 0;
      if (response.usage && agent.config.modelProvider && agent.config.model) {
        const costCalculation = llmService.calculateUsage(
          [],
          response.content,
          agent.config.modelProvider,
          agent.config.model,
          response.usage.promptTokens,
          response.usage.completionTokens
        );
        costUSD = costCalculation.totalCost;
      }

      // Save assistant message
      const assistantMessageId = randomUUID();
      const assistantMessage: NewMessage = {
        id: assistantMessageId,
        conversationId: conversation.id,
        role: 'assistant',
        content: response.content,
        aiModelId: agent.config.model,
        modelProvider: agent.config.modelProvider,
        modelName: agent.config.model,
        agentName: agent.config.name,
        inputTokens: response.usage?.promptTokens || 0,
        outputTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
        processingTimeMs,
        costUSD,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(messages).values(assistantMessage);

      // Update conversation updated timestamp
      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, conversation.id));

      // Log successful agent execution analytics
      if (response.usage && agent.config.model) {
        await analyticsService.logModelUsage(
          agent.config.model,
          response.usage.totalTokens,
          costUSD,
          processingTimeMs
        );
      }

      // Log agent execution event
      await analyticsService.logCustomEvent({
        eventType: 'agent_used',
        conversationId: conversation.id,
        processingTimeMs,
        eventData: {
          agentId,
          agentType: agent.config.type,
          modelProvider: agent.config.modelProvider,
          model: agent.config.model,
          useTools: agent.config.useTools,
          streaming: agent.config.streaming,
          tokenCount: response.usage?.totalTokens,
          costUSD,
          eventSubType: 'agent_executed',
        },
      });

      // Log assistant message analytics
      await analyticsService.logAgentUsed(
        conversation.id,
        assistantMessageId,
        agent.config.name
      );

      // Add conversation ID to response metadata
      return {
        ...response,
        metadata: {
          ...response.metadata,
          conversationId: conversation.id,
        },
      };
    } catch (error) {
      // Log error analytics
      await analyticsService.logError(
        'agent_execution',
        error instanceof Error ? error.message : 'Unknown error',
        input.conversationId,
        undefined
      );

      throw error;
    }
  }

  // Service integration methods
  getAvailableModels() {
    return completionService.getAvailableModels();
  }

  getMcpStatus() {
    return completionService.getMcpStatus();
  }

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId)?.config;
  }

  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map((agent) => agent.config);
  }
}
