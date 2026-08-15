/* eslint-disable import-x/no-unused-modules -- Public agent runtime module. */
import { titleGenerationService } from '@/services/titleGeneration';

import type {
  AgentInput,
  AgentResponse,
  BaseAgentInterface,
} from '@/agents/types';

import { getContentAsString } from '@/utils/getContentAsString';
import { textSanitizer } from '@/utils/sanitization';

import { type Conversation, conversationStore } from './conversationStore';

/** Owns execution, normalized input, cancellation, and successful completion. */
export class AgentRunner {
  async run(
    agent: BaseAgentInterface,
    input: AgentInput,
    conversation: Conversation
  ): Promise<{ response: AgentResponse; normalizedMessage: string }> {
    if (input.signal?.aborted) throw input.signal.reason;
    const normalizedMessage = textSanitizer.sanitizeUserMessage(
      input.message
    ).sanitized;
    if (!normalizedMessage.trim()) throw new Error('Message cannot be empty');

    const context =
      conversation.context && typeof conversation.context === 'object'
        ? (conversation.context as Record<string, unknown>)
        : {};
    const response = await agent.execute(
      { ...input, message: normalizedMessage, context },
      conversation.id
    );
    if (input.signal?.aborted) throw input.signal.reason;

    if (!response.stream) {
      const content = response.messages?.at(-1);
      await titleGenerationService.updateConversationTitleIfNeeded(
        conversation.id,
        {
          message: normalizedMessage,
          aiResponse: content ? getContentAsString(content.content) : '',
          user: input.user,
          workspace: input.workspace,
        }
      );
    }
    await conversationStore.touch(conversation.id);
    return { response, normalizedMessage };
  }
}

export const agentRunner = new AgentRunner();
