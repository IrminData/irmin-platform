import { conversations, db, messages, type NewMessage } from '@/database';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { analyticsService } from '@/services/analytics';
import { llmService } from '@/services/llm';
import { titleGenerationService } from '@/services/titleGeneration';

import { AssistantAgent } from '@/agents/assistant';
import { QueryAgent } from '@/agents/query';
import { ScriptingAgent } from '@/agents/scripting';
import {
  AgentConfig,
  AgentInput,
  AgentResponse,
  BaseAgentInterface,
} from '@/agents/types';

import { textSanitizer } from '@/utils/sanitization';

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

  async executeAgent(
    agentId: string,
    input: AgentInput
  ): Promise<{
    agentResponse: AgentResponse;
    conversationId: string;
    userMessageId: string;
    sanitizedMessage: string;
  }> {
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

        // Check if conversation has an agentId set
        if (conversation.agentId && conversation.agentId !== agentId) {
          throw new Error(
            `This conversation is associated with agent '${conversation.agentId}' and cannot be used with agent '${agentId}'`
          );
        }

        // If conversation doesn't have an agentId set, update it to the current agent
        if (!conversation.agentId) {
          await db
            .update(conversations)
            .set({ agentId, updatedAt: new Date() })
            .where(eq(conversations.id, conversation.id));
          conversation.agentId = agentId;
        }
      } else {
        // Create new conversation with fallback title
        const id = randomUUID();
        const now = new Date();

        // Use titleGenerationService to create fallback title
        const fallbackTitle = titleGenerationService.createFallbackTitle();

        const newConversation = {
          id,
          title: fallbackTitle,
          metadata: {},
          agentId,
          workspaceSlug: input.workspace.slug,
          userId: input.user.id,
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(conversations).values(newConversation);
        conversation = newConversation;

        // Log analytics
        analyticsService.logConversationEvent('conversation_created', id);
      }

      // Sanitize user message
      const sanitizedMessage = textSanitizer.sanitizeUserMessage(input.message);

      // Validate message is not empty after sanitization
      if (
        !sanitizedMessage.sanitized ||
        sanitizedMessage.sanitized.trim().length === 0
      ) {
        throw new Error('Message cannot be empty');
      }

      // Save user message (sanitized)
      const userMessageId = randomUUID();
      const now = new Date();
      const userMessage: NewMessage = {
        id: userMessageId,
        conversationId: conversation.id,
        role: 'user',
        content: sanitizedMessage.sanitized,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(messages).values(userMessage);

      // Log user message analytics
      analyticsService.logMessageSent(conversation.id, userMessageId);

      // Execute agent with sanitized message
      const sanitizedInput = {
        ...input,
        message: sanitizedMessage.sanitized,
      };
      const response = await agent.execute(sanitizedInput, conversation.id);
      const processingTimeMs = Date.now() - startTime;

      // Check if this is a streaming response
      const isStreamingResponse = !!response.stream;

      // Calculate cost for agent execution (for both streaming and non-streaming)
      let costUSD = 0;
      let costCalculation = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        totalCost: 0,
      };
      if (agent.config.modelProvider && agent.config.model) {
        costCalculation = llmService.calculateUsage(
          [],
          response.content,
          agent.config.modelProvider,
          agent.config.model
        );
        costUSD = costCalculation.totalCost;
      }

      // For non-streaming responses, save the assistant message immediately
      if (!isStreamingResponse) {
        // Save assistant message blocks
        const now = new Date();
        const blocks = response.blocks || [];
        const assistantMessagePromises = blocks.map((block) => {
          const messageId = randomUUID();
          const message: NewMessage = {
            id: messageId,
            conversationId: conversation.id,
            role: 'assistant',
            content: block.content,
            messageType: block.type,
            blockId: block.id,
            parentBlockId: block.parentBlockId,
            blockOrder: block.order,
            aiModelId: agent.config.model,
            modelProvider: agent.config.modelProvider,
            modelName: agent.config.model,
            agentName: agent.config.name,
            inputTokens: Math.floor(
              costCalculation.inputTokens / Math.max(blocks.length, 1)
            ),
            outputTokens: Math.floor(
              costCalculation.outputTokens / Math.max(blocks.length, 1)
            ),
            totalTokens: Math.floor(
              costCalculation.totalTokens / Math.max(blocks.length, 1)
            ),
            processingTimeMs: Math.floor(
              processingTimeMs / Math.max(blocks.length, 1)
            ),
            costUSD: costUSD / Math.max(blocks.length, 1),
            metadata: block.metadata || {},
            createdAt: now,
            updatedAt: now,
          };
          return db.insert(messages).values(message);
        });

        await Promise.all(assistantMessagePromises);

        // Log assistant message analytics
        analyticsService.logAgentUsed(
          conversation.id,
          userMessageId,
          agent.config.name
        );

        // Update conversation title with AI response context (async, don't wait)
        if (response.content) {
          titleGenerationService
            .updateTitleWithAIResponse(
              conversation.id,
              sanitizedMessage.sanitized,
              response.content,
              {
                user: input.user,
                workspace: input.workspace,
              }
            )
            .catch((error) => {
              console.warn(
                'Failed to update conversation title with AI response:',
                error instanceof Error ? error.message : 'Unknown error'
              );
            });
        }
      }

      // Update conversation updated timestamp
      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, conversation.id));

      // Add conversation ID to response metadata and include messages for non-streaming responses
      const agentResponse: AgentResponse = {
        ...response,
        metadata: {
          ...response.metadata,
          conversationId: conversation.id,
        },
      };

      // For non-streaming responses, include the messages array
      if (!isStreamingResponse) {
        // Fetch the messages that were just created
        const createdMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(messages.createdAt);

        // Filter to only include assistant messages from this execution
        const assistantMessages = createdMessages.filter(
          (msg) => msg.role === 'assistant' && msg.createdAt >= now
        );

        agentResponse.messages = assistantMessages;
      }

      return {
        agentResponse,
        conversationId: conversation.id,
        userMessageId,
        sanitizedMessage: sanitizedMessage.sanitized,
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
      analyticsService.logError(
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
