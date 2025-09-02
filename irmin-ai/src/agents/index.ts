import { conversations, db, messages, type NewMessage } from '@/database';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { analyticsService } from '@/services/analytics';
import { llmService } from '@/services/llm';
import { titleGenerationService } from '@/services/titleGeneration';

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
  ): Promise<{ agentResponse: AgentResponse; conversationId: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.validateInput(input)) {
      throw new Error('Invalid input for agent');
    }

    let conversation: typeof conversations.$inferSelect;
    const startTime = Date.now();

    try {
      // Validate workspace and user context
      if (!input.workspace || !input.user) {
        throw new Error(
          'Workspace and user context required for agent execution'
        );
      }

      // Create or get existing conversation
      if (input.conversationId) {
        const existingConversation = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, input.conversationId),
              eq(conversations.workspaceSlug, input.workspace.slug),
              eq(conversations.userId, input.user.id)
            )
          );
        if (!existingConversation.length) {
          throw new Error('Conversation not found');
        }
        conversation = existingConversation[0];
      } else {
        // Create new conversation with initial fallback title
        const id = randomUUID();
        const now = new Date();
        const newConversation = {
          id,
          title:
            input.message.substring(0, 50) +
            (input.message.length > 50 ? '...' : ''),
          metadata: {},
          workspaceSlug: input.workspace.slug,
          userId: input.user.id,
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(conversations).values(newConversation);
        conversation = newConversation;

        // Log analytics
        await analyticsService.logConversationEvent('conversation_created', id);

        // Generate proper title asynchronously (don't wait for it) - but only for non-title-generation agents
        if (agentId !== 'title-generation' && input.authToken) {
          titleGenerationService
            .updateConversationTitleIfNeeded(id, {
              message: input.message,
              user: input.user,
              workspace: input.workspace,
              authToken: input.authToken,
            })
            .catch((error) => {
              console.warn(
                'Failed to generate conversation title:',
                error instanceof Error ? error.message : 'Unknown error'
              );
            });
        }
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
      const response = await agent.execute({
        ...input,
        conversationId: conversation.id, // Ensure conversationId is set to the actual conversation ID
      });
      const processingTimeMs = Date.now() - startTime;

      // Check if this is a streaming response
      const isStreamingResponse = !!response.stream;

      // Calculate cost for agent execution (for both streaming and non-streaming)
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

      // For non-streaming responses, save the assistant message immediately
      if (!isStreamingResponse) {
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

        // Log assistant message analytics
        await analyticsService.logAgentUsed(
          conversation.id,
          assistantMessageId,
          agent.config.name
        );
      }

      // Log successful agent execution analytics (for both streaming and non-streaming)
      if (response.usage && agent.config.model) {
        await analyticsService.logModelUsage(
          agent.config.model,
          response.usage.totalTokens,
          costUSD,
          processingTimeMs
        );
      }

      // Update conversation updated timestamp
      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, conversation.id));

      // Add conversation ID to response metadata
      return {
        agentResponse: {
          ...response,
          metadata: {
            ...response.metadata,
            conversationId: conversation.id,
          },
        },
        conversationId: conversation.id,
      };
    } catch (error) {
      // Log error analytics only if we have a valid conversation ID
      // Don't log analytics for "Conversation not found" errors as the conversation doesn't exist
      if (
        error instanceof Error &&
        error.message === 'Conversation not found'
      ) {
        // Don't log analytics for non-existent conversations
        throw error;
      }

      // Log error analytics for other types of errors
      await analyticsService.logError(
        'agent_execution',
        error instanceof Error ? error.message : 'Unknown error',
        input.conversationId,
        undefined
      );

      throw error;
    }
  }

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId)?.config;
  }

  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map((agent) => agent.config);
  }
}
