import {
  conversations,
  db,
  type Message,
  messages,
  type NewMessage,
} from '@/database';
import { toUIMessageStream } from '@ai-sdk/langchain';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

import { analyticsService } from '@/services/analytics';
import { llmService } from '@/services/llm';
import type { LLMProvider } from '@/services/llm';

interface StreamingMessageOptions {
  conversationId: string;
  startTime?: number; // Made optional since for streaming responses, the message is already stored
  modelProvider?: LLMProvider;
  model?: string;
  agentName?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  history?: Message[];
  skipMessageStorage?: boolean; // Flag to skip message storage if already handled
}

/**
 * Creates a ReadableStream that processes a UI message stream and stores the complete response
 * @param stream - The LangChain stream to process
 * @param options - Configuration options for message storage
 */
export function createStoredUIMessageStream(
  stream: IterableReadableStream<AIMessageChunk>,
  options: StreamingMessageOptions
): ReadableStream {
  const uiMessageStream = toUIMessageStream(stream);

  return new ReadableStream({
    async start(controller) {
      let fullContent = '';
      const {
        startTime,
        conversationId,
        usage,
        history = [],
        skipMessageStorage = false,
      } = options;

      try {
        // Consume the UI message stream and convert it to chunks
        for await (const chunk of uiMessageStream) {
          if (chunk && typeof chunk === 'object') {
            // Extract content from the chunk
            if (chunk.type === 'text-delta' && chunk.delta) {
              fullContent += chunk.delta;
            }

            // Convert the chunk to a JSON string
            const chunkData = JSON.stringify(chunk);
            controller.enqueue(new TextEncoder().encode(chunkData + '\n'));
          }
        }

        // Store the assistant message in the database once stream is complete
        // Skip storage if flag is set (for streaming responses where message is already stored)
        if (fullContent && !skipMessageStorage) {
          const assistantMessageId = randomUUID();
          const now = new Date();
          const processingTimeMs = startTime ? Date.now() - startTime : 0;

          // Calculate cost if model info is available
          let costUSD = 0;
          let inputTokens = 0;
          let outputTokens = 0;
          let totalTokens = 0;

          if (options.modelProvider && options.model) {
            const costCalculation = llmService.calculateUsage(
              history,
              fullContent,
              options.modelProvider,
              options.model,
              usage?.promptTokens,
              usage?.completionTokens
            );
            costUSD = costCalculation.totalCost;
            inputTokens = costCalculation.inputTokens;
            outputTokens = costCalculation.outputTokens;
            totalTokens = costCalculation.totalTokens;
          } else if (usage) {
            inputTokens = usage.promptTokens || 0;
            outputTokens = usage.completionTokens || 0;
            totalTokens = usage.totalTokens || 0;
          }

          const assistantMessage: NewMessage = {
            id: assistantMessageId,
            conversationId,
            role: 'assistant',
            content: fullContent,
            aiModelId: options.model || null,
            modelProvider: options.modelProvider || null,
            modelName: options.model || null,
            agentName: options.agentName || null,
            inputTokens,
            outputTokens,
            totalTokens,
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
            .where(eq(conversations.id, conversationId));

          // Log assistant message analytics
          await analyticsService.logAgentUsed(
            conversationId,
            assistantMessageId,
            options.agentName
          );
        }

        controller.close();
      } catch (error) {
        console.error('Error processing UI message stream:', error);
        controller.error(error);
      }
    },
  });
}
