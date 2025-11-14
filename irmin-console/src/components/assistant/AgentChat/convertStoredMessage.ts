import type { StoredMessage } from '@langchain/core/messages';

import type { AIMessage } from '@/types/ai/base';

import {
  extractTextFromContent,
  extractThinkingFromContent,
} from './langchainStreamTypes';

/**
 * Convert LangChain StoredMessage to AIMessage format(s)
 * Returns an array because a single StoredMessage may contain multiple logical messages
 * (e.g., thinking blocks + text content)
 */
function convertStoredMessage(
  storedMessage: StoredMessage,
  conversationId: string
): AIMessage[] {
  const baseId = storedMessage.data?.id || `msg-${Date.now()}-${Math.random()}`;

  // Map LangChain message type to role
  let role: 'user' | 'assistant' | 'system' = 'assistant';
  const msgType = storedMessage.type;
  if (msgType === 'human') {
    role = 'user';
  } else if (msgType === 'system') {
    role = 'system';
  } else if (msgType === 'ai') {
    role = 'assistant';
  }

  // Extract metadata from response_metadata
  const responseMetadata = storedMessage.data?.response_metadata as
    | Record<string, unknown>
    | undefined;
  const metadata = responseMetadata || {};

  // Extract token usage if available
  const usageMetadata = responseMetadata?.usage_metadata as
    | Record<string, unknown>
    | undefined;
  const inputTokens = (usageMetadata?.input_tokens as number) || 0;
  const outputTokens = (usageMetadata?.output_tokens as number) || 0;
  const totalTokens =
    (usageMetadata?.total_tokens as number) || inputTokens + outputTokens;

  const messages: AIMessage[] = [];

  // Handle content - can be string or array of content blocks
  const rawContent = storedMessage.data?.content;
  let textContent = '';
  const thinkingBlocks: string[] = [];

  if (typeof rawContent === 'string') {
    textContent = rawContent;
  } else if (Array.isArray(rawContent)) {
    // Extract text and thinking separately
    textContent = extractTextFromContent(rawContent);
    thinkingBlocks.push(...extractThinkingFromContent(rawContent));
  }

  // Store thinking blocks in metadata instead of creating separate messages
  // This prevents duplicate "Thinking Steps" displays
  const enrichedMetadata = { ...metadata };
  if (thinkingBlocks.length > 0) {
    enrichedMetadata.thinkingSteps = thinkingBlocks;
  }

  // Determine message type for main content
  let messageType: AIMessage['messageType'] = 'text';
  const additionalKwargs = storedMessage.data?.additional_kwargs as
    | Record<string, unknown>
    | undefined;
  if (
    additionalKwargs?.tool_calls &&
    Array.isArray(additionalKwargs.tool_calls)
  ) {
    messageType = 'tool_call';
    // Extract and store tool calls in metadata
    enrichedMetadata.toolCalls = additionalKwargs.tool_calls;
  } else if (storedMessage.type === 'tool') {
    messageType = 'tool_result';
  }

  // Create main message (even if content is empty, for consistency)
  messages.push({
    id: baseId,
    conversationId,
    role,
    content: textContent,
    metadata: enrichedMetadata,
    messageType,
    blockId: null,
    parentBlockId: null,
    blockOrder: 0,
    aiModelId: null,
    modelProvider: null,
    modelName: null,
    agentName: null,
    inputTokens,
    outputTokens,
    totalTokens,
    costUSD: 0,
    processingTimeMs: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return messages;
}

/**
 * Convert array of StoredMessages to AIMessages
 */
export function convertStoredMessages(
  storedMessages: StoredMessage[],
  conversationId: string
): AIMessage[] {
  const allMessages: AIMessage[] = [];

  for (const msg of storedMessages) {
    const converted = convertStoredMessage(msg, conversationId);
    allMessages.push(...converted);
  }

  return allMessages;
}
