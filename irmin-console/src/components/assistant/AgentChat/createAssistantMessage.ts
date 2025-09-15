import type { AIMessage } from '@/types/ai/base';

import type { ServerReasoningEvent, ServerStreamEvent } from './types';

// Create assistant message from streaming data
export const createAssistantMessage = (
  content: string,
  parts: ServerStreamEvent[],
  conversationId: string | null,
  agentId: string,
  messageId?: string
): AIMessage => {
  return {
    id: messageId || `assistant-${Date.now()}`,
    conversationId: conversationId || '',
    role: 'assistant',
    content: content.trim() || '[Response interrupted]',
    metadata: {
      toolCalls: parts.filter(
        (p) =>
          p.type === 'tool-input-available' ||
          p.type === 'tool-output-available'
      ),
      thinkingSteps: parts
        .filter((p) => p.type === 'reasoning-end')
        .map((p) => (p as ServerReasoningEvent).delta || ''),
      iterations: undefined,
      errors: parts.filter(
        (p) => p.type === 'stream-error' || p.type === 'error'
      ),
    },
    messageType: 'text',
    blockId: null,
    parentBlockId: null,
    blockOrder: 0,
    aiModelId: null,
    modelProvider: null,
    modelName: null,
    agentName: agentId,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUSD: 0,
    processingTimeMs: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
