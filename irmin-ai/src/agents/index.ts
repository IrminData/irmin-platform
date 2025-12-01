import { conversations, db } from '@/database';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { BaseMessage } from 'langchain';

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

import { getContentAsString } from '@/utils/getContentAsString';
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

      // Merge contexts: new values replace existing, but keep existing values not provided
      // If new context has keys with empty/null/undefined values, keep stored values
      const storedContext =
        (conversation.context as Record<string, unknown>) || {};
      const newContext = input.context || {};
      const mergedContext: Record<string, unknown> = { ...storedContext };

      for (const [key, value] of Object.entries(newContext)) {
        // Only update if the new value is not empty/null/undefined
        if (value !== null && value !== undefined && value !== '') {
          mergedContext[key] = value;
        }
        // If value is null/undefined/empty string, keep the stored value (already in mergedContext)
      }

      // If conversation doesn't have an agentId set, update it to the current agent
      if (!conversation.agentId) {
        await db
          .update(conversations)
          .set({ agentId, updatedAt: new Date(), context: mergedContext })
          .where(eq(conversations.id, conversation.id));
        conversation.agentId = agentId;
        conversation.context = mergedContext;
      } else {
        // Update context for existing conversation
        await db
          .update(conversations)
          .set({ updatedAt: new Date(), context: mergedContext })
          .where(eq(conversations.id, conversation.id));
        conversation.context = mergedContext;
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
        context: input.context || {},
        agentId,
        workspaceSlug: input.workspace.slug,
        userId: input.user.id,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(conversations).values(newConversation);
      conversation = newConversation;
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

    // Get context from conversation (already merged for existing conversations)
    const contextForAgent =
      conversation.context && typeof conversation.context === 'object'
        ? (conversation.context as Record<string, unknown>)
        : {};

    // Execute agent with sanitized message and context
    const sanitizedInput = {
      ...input,
      message: sanitizedMessage.sanitized,
      context: contextForAgent,
    };
    const response = await agent.execute(sanitizedInput, conversation.id);
    const executionTimestamp = new Date();

    // Check if this is a streaming response
    const isStreamingResponse = !!response.stream;

    // For streaming responses, generate title without the AI response context
    if (isStreamingResponse && response.stream) {
      titleGenerationService
        .updateTitle(conversation.id, sanitizedMessage.sanitized, {
          user: input.user,
          workspace: input.workspace,
        })
        .catch((error) => {
          console.warn(
            'Failed to update conversation title:',
            error instanceof Error ? error.message : 'Unknown error'
          );
        });
    }

    // For non-streaming responses, save the assistant message immediately
    if (
      !isStreamingResponse &&
      response.messages &&
      response.messages.length > 0
    ) {
      const lastMessage = response.messages[response.messages.length - 1];
      const content = lastMessage
        ? getContentAsString(lastMessage.content)
        : '';
      // Update conversation title with AI response context (async, don't wait)
      titleGenerationService
        .updateTitle(
          conversation.id,
          sanitizedMessage.sanitized,
          {
            user: input.user,
            workspace: input.workspace,
          },
          content
        )
        .catch((error) => {
          console.warn(
            'Failed to update conversation title with AI response:',
            error instanceof Error ? error.message : 'Unknown error'
          );
        });
    }

    // Update conversation updated timestamp
    await db
      .update(conversations)
      .set({ updatedAt: executionTimestamp })
      .where(eq(conversations.id, conversation.id));

    // Add conversation ID to response metadata
    const agentResponse: AgentResponse = {
      ...response,
      conversationId: conversation.id,
    };

    return {
      agentResponse,
      conversationId: conversation.id,
      sanitizedMessage: sanitizedMessage.sanitized,
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

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId)?.config;
  }

  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map((agent) => agent.config);
  }
}
