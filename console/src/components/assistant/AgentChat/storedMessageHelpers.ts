import type { StoredMessage } from '@langchain/core/messages';

import {
  extractTextFromContent,
  extractThinkingFromContent,
} from './langchainStreamTypes';

/**
 * Get role from StoredMessage type
 */
export function getMessageRole(
  message: StoredMessage
): 'user' | 'assistant' | 'system' {
  if (message.type === 'human') {
    return 'user';
  }
  if (message.type === 'system') {
    return 'system';
  }
  if (message.type === 'ai') {
    return 'assistant';
  }
  return 'assistant'; // Default fallback
}

/**
 * Get content from StoredMessage
 */
export function getMessageContent(message: StoredMessage): string {
  const rawContent = message.data?.content;
  if (typeof rawContent === 'string') {
    return rawContent;
  }
  if (Array.isArray(rawContent)) {
    return extractTextFromContent(rawContent);
  }
  return '';
}

/**
 * Determine message type based on StoredMessage structure
 */
export function getMessageType(
  message: StoredMessage
): 'text' | 'tool_call' | 'tool_result' | 'reasoning' {
  if (message.type === 'tool') {
    return 'tool_result';
  }

  const additionalKwargs = message.data?.additional_kwargs;
  if (
    additionalKwargs?.tool_calls &&
    Array.isArray(additionalKwargs.tool_calls) &&
    additionalKwargs.tool_calls.length > 0
  ) {
    return 'tool_call';
  }

  // Check content for text and thinking blocks
  const rawContent = message.data?.content;
  if (Array.isArray(rawContent)) {
    // Extract both text and thinking blocks
    const textContent = extractTextFromContent(rawContent);
    const thinkingBlocks = extractThinkingFromContent(rawContent);

    // If there's text content, it's a text message (thinking blocks shown via metadata)
    if (textContent.trim().length > 0) {
      return 'text';
    }

    // Only return 'reasoning' if there are thinking blocks but no text
    if (thinkingBlocks.length > 0) {
      return 'reasoning';
    }
  }

  return 'text';
}

/**
 * Get message ID from StoredMessage
 */
export function getMessageId(message: StoredMessage): string {
  return message.data?.id || `${message.type}-${Date.now()}-${Math.random()}`;
}

/**
 * Get metadata from StoredMessage
 */
export function getMessageMetadata(
  message: StoredMessage
): Record<string, unknown> {
  const responseMetadata =
    (message.data?.response_metadata as Record<string, unknown>) || {};
  const metadata: Record<string, unknown> = { ...responseMetadata };

  // Extract thinking blocks from multiple possible locations:
  // 1. From content array (LangChain content blocks with type: 'thinking')
  // 2. From response_metadata.thinkingSteps (our streaming format)
  // 3. From response_metadata.thinking (alternative format)
  const rawContent = message.data?.content;
  if (Array.isArray(rawContent)) {
    const thinkingBlocks = extractThinkingFromContent(rawContent);
    if (thinkingBlocks.length > 0) {
      metadata.thinkingSteps = thinkingBlocks;
    }
  }

  // Also check response_metadata for thinking (may already be there from streaming)
  if (!metadata.thinkingSteps && responseMetadata.thinking) {
    const thinking = responseMetadata.thinking;
    if (typeof thinking === 'string') {
      metadata.thinkingSteps = [thinking];
    } else if (Array.isArray(thinking)) {
      metadata.thinkingSteps = thinking;
    }
  }

  // Extract tool calls if they exist
  const additionalKwargs = message.data?.additional_kwargs as
    | Record<string, unknown>
    | undefined;
  if (
    additionalKwargs?.tool_calls &&
    Array.isArray(additionalKwargs.tool_calls)
  ) {
    metadata.toolCalls = additionalKwargs.tool_calls;
  }

  return metadata;
}
