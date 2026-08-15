import type { StoredMessage } from '@langchain/core/messages';

function extractTextFromContent(content: unknown[]): string {
  return content
    .map((block) => {
      if (typeof block !== 'object' || block === null) return '';
      const value = block as Record<string, unknown>;
      return value.type === 'text' && typeof value.text === 'string'
        ? value.text
        : '';
    })
    .join('');
}

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

  // Browser-visible stored messages contain text only; provider reasoning is
  // stripped by the AI runtime before serialization.
  const rawContent = message.data?.content;
  if (Array.isArray(rawContent)) {
    const textContent = extractTextFromContent(rawContent);
    if (textContent.trim().length > 0) {
      return 'text';
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

  // Extract tool calls if they exist
  const additionalKwargs = message.data?.additional_kwargs as
    Record<string, unknown> | undefined;
  if (
    additionalKwargs?.tool_calls &&
    Array.isArray(additionalKwargs.tool_calls)
  ) {
    metadata.toolCalls = additionalKwargs.tool_calls;
  }

  return metadata;
}
