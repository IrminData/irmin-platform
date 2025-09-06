import {
  conversations,
  db,
  type Message,
  messages,
  type NewMessage,
} from '@/database';
import type { AIMessageChunk } from '@langchain/core/messages';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

import { analyticsService } from '@/services/analytics';
import { llmService } from '@/services/llm';
import type { LLMProvider } from '@/services/llm';

interface StreamingMessageOptions {
  conversationId: string;
  startTime?: number;
  modelProvider?: LLMProvider;
  model?: string;
  agentName?: string;
  history?: Message[];
  skipMessageStorage?: boolean;
}

interface MessageBlock {
  id: string;
  type:
    | 'text'
    | 'tool_call'
    | 'tool_result'
    | 'reasoning'
    | 'source'
    | 'file'
    | 'error'
    | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  parentBlockId?: string;
  order: number;
  toolCallId?: string;
  toolName?: string;
  sourceId?: string;
  url?: string;
}

interface ContentProcessingContext {
  currentBlocks: Map<string, MessageBlock>;
  currentTextBlockId: string | null;
  blockOrder: number;
  controller: ReadableStreamDefaultController<string>;
}

interface ContentProcessingResult {
  newTextBlockId?: string;
  incrementBlockOrder?: boolean;
}

/**
 * Helper function to safely convert content to string
 */
function contentToString(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content);
  }
  return String(content);
}

/**
 * Helper function to safely escape JSON strings
 */
function escapeJsonString(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/**
 * Comprehensive content processor that handles all possible block types
 */
function processContentChunk(
  value: AIMessageChunk,
  context: ContentProcessingContext
): ContentProcessingResult {
  const { currentBlocks, currentTextBlockId, blockOrder, controller } = context;
  let hasSpecialContent = false;
  let newTextBlockId = currentTextBlockId;
  let incrementBlockOrder = false;

  // NEW PRIORITY CHECK: Handle explicit tool results from agentGraph.ts
  if (value.additional_kwargs?.tool_result) {
    const contentStr = contentToString(value.content);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const toolResultBlockId = randomUUID();

    currentBlocks.set(toolResultBlockId, {
      id: toolResultBlockId,
      type: 'tool_result',
      content: contentStr,
      order: blockOrder,
      toolCallId: value.additional_kwargs.tool_call_id as string, // Use tool_call_id from additional_kwargs
    });

    controller.enqueue(
      `{"type":"tool-output-available","toolCallId":"${value.additional_kwargs.tool_call_id}","output":"${escapeJsonString(contentStr)}"}\n`
    );
    return { newTextBlockId: newTextBlockId ?? undefined, incrementBlockOrder }; // Return early as this chunk is fully handled
  }

  // PRIORITY CHECK: Only use JSON content tool call detection if no explicit tool calls are present
  // This prevents conflicts with agent graph which uses explicit tool_calls field
  if (
    value.content &&
    typeof value.content === 'string' &&
    !value.tool_calls?.length
  ) {
    const content = value.content;

    // Check for tool call patterns - but only if no explicit tool calls
    const isToolCallStart =
      content.startsWith('{"name"') || content.startsWith('{"');
    const containsToolCallSignature =
      content.includes('"name"') &&
      (content.includes('"args"') || content.includes('"type":"tool_call"'));

    if (isToolCallStart || containsToolCallSignature) {
      // This looks like a tool call - handle it specially
      hasSpecialContent = true;
      incrementBlockOrder = true;

      // End any existing text block first
      if (currentTextBlockId) {
        const existingBlock = currentBlocks.get(currentTextBlockId);
        if (existingBlock && existingBlock.type === 'text') {
          controller.enqueue(
            `{"type":"text-end","id":"${currentTextBlockId}"}\n`
          );
        }
      }

      // Create new tool call block
      const toolCallBlockId = randomUUID();
      newTextBlockId = toolCallBlockId;

      currentBlocks.set(toolCallBlockId, {
        id: toolCallBlockId,
        type: 'tool_call',
        content: content,
        order: blockOrder,
      });

      controller.enqueue(
        `{"type":"tool-input-start","toolCallId":"${toolCallBlockId}","toolName":"tool_call"}\n`
      );

      // Try to parse if it looks complete
      if (content.endsWith('}') && content.startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.name && parsed.args) {
            const block = currentBlocks.get(toolCallBlockId);
            if (block) {
              block.toolCallId = parsed.id || toolCallBlockId;
              block.toolName = parsed.name;
              block.metadata = { args: parsed.args };
            }
            controller.enqueue(
              `{"type":"tool-input-available","toolCallId":"${parsed.id || toolCallBlockId}","toolName":"${parsed.name}","input":${JSON.stringify(parsed.args)}}\n`
            );
          }
        } catch {
          // Not complete JSON yet, will accumulate in text handler
        }
      }

      return { newTextBlockId, incrementBlockOrder };
    }
  }

  // 1. Handle reasoning content (highest priority)
  if (value.additional_kwargs?.reasoning) {
    const reasoningContent = contentToString(value.additional_kwargs.reasoning);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const reasoningBlockId = randomUUID();

    currentBlocks.set(reasoningBlockId, {
      id: reasoningBlockId,
      type: 'reasoning',
      content: reasoningContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
      },
    });

    // Send reasoning events
    controller.enqueue(
      `{"type":"reasoning-start","id":"${reasoningBlockId}"}\n`
    );
    controller.enqueue(
      `{"type":"reasoning-delta","delta":"${escapeJsonString(reasoningContent)}","id":"${reasoningBlockId}"}\n`
    );
    controller.enqueue(`{"type":"reasoning-end","id":"${reasoningBlockId}"}\n`);
  }

  // 2. Handle thinking content
  if (!hasSpecialContent && value.additional_kwargs?.thinking) {
    const thinkingContent = contentToString(value.additional_kwargs.thinking);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const thinkingBlockId = randomUUID();

    currentBlocks.set(thinkingBlockId, {
      id: thinkingBlockId,
      type: 'reasoning', // Use reasoning type for thinking content
      content: thinkingContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
        type: 'thinking',
      },
    });

    // Send reasoning events for thinking content
    controller.enqueue(
      `{"type":"reasoning-start","id":"${thinkingBlockId}"}\n`
    );
    controller.enqueue(
      `{"type":"reasoning-delta","delta":"${escapeJsonString(thinkingContent)}","id":"${thinkingBlockId}"}\n`
    );
    controller.enqueue(`{"type":"reasoning-end","id":"${thinkingBlockId}"}\n`);
  }

  // 2.5. Handle tool call feedback (retry logic)
  if (!hasSpecialContent && value.additional_kwargs?.tool_call_feedback) {
    const feedbackContent = contentToString(value.content);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const feedbackBlockId = randomUUID();

    currentBlocks.set(feedbackBlockId, {
      id: feedbackBlockId,
      type: 'reasoning', // Use reasoning type for tool feedback
      content: feedbackContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
        type: 'tool_feedback',
        original_error: value.additional_kwargs.original_error,
      },
    });

    // Send reasoning events for tool feedback
    controller.enqueue(
      `{"type":"reasoning-start","id":"${feedbackBlockId}"}\n`
    );
    controller.enqueue(
      `{"type":"reasoning-delta","delta":"${escapeJsonString(feedbackContent)}","id":"${feedbackBlockId}"}\n`
    );
    controller.enqueue(`{"type":"reasoning-end","id":"${feedbackBlockId}"}\n`);
  }

  // 3. Handle iteration events
  if (!hasSpecialContent && value.additional_kwargs?.iteration) {
    hasSpecialContent = true;
    controller.enqueue(
      `{"type":"iteration","iteration":${value.additional_kwargs.iteration}}\n`
    );
  }

  // 4. Handle system messages
  if (!hasSpecialContent && value.additional_kwargs?.system) {
    const systemContent = contentToString(value.additional_kwargs.system);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const systemBlockId = randomUUID();

    currentBlocks.set(systemBlockId, {
      id: systemBlockId,
      type: 'system',
      content: systemContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
      },
    });

    controller.enqueue(
      `{"type":"system","content":"${escapeJsonString(systemContent)}"}\n`
    );
  }

  // 5. Handle explicit tool calls
  if (!hasSpecialContent && value.tool_calls && value.tool_calls.length > 0) {
    hasSpecialContent = true;
    incrementBlockOrder = true;

    for (const toolCall of value.tool_calls) {
      const toolCallBlockId = randomUUID();

      currentBlocks.set(toolCallBlockId, {
        id: toolCallBlockId,
        type: 'tool_call',
        content: JSON.stringify(toolCall),
        order: blockOrder,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        metadata: {
          args: toolCall.args,
        },
      });

      // Send tool call events
      controller.enqueue(
        `{"type":"tool-input-start","toolCallId":"${toolCall.id}","toolName":"${toolCall.name}"}\n`
      );
      controller.enqueue(
        `{"type":"tool-input-available","toolCallId":"${toolCall.id}","toolName":"${toolCall.name}","input":${JSON.stringify(toolCall.args)}}\n`
      );
    }
  }

  // 6. Handle tool call JSON in content (LangGraph pattern) - but only if no explicit tool calls
  if (
    !hasSpecialContent &&
    value.content &&
    typeof value.content === 'string' &&
    !value.tool_calls?.length
  ) {
    // Enhanced tool call detection - also check if we need to transition from text to tool call
    const isToolCallStart = value.content.startsWith('{"name"');
    const isToolCallJson =
      isToolCallStart ||
      (value.content.includes('"name"') &&
        value.content.includes('"args"') &&
        value.content.includes('"id"'));

    if (isToolCallJson) {
      hasSpecialContent = true;
      incrementBlockOrder = true;

      // If we already have a text block, end it first
      if (currentTextBlockId) {
        const textBlock = currentBlocks.get(currentTextBlockId);
        if (textBlock && textBlock.type === 'text') {
          controller.enqueue(
            `{"type":"text-end","id":"${currentTextBlockId}"}\n`
          );
        }
      }

      // Create a new tool call block
      const toolCallBlockId = randomUUID();
      newTextBlockId = toolCallBlockId;
      currentBlocks.set(toolCallBlockId, {
        id: toolCallBlockId,
        type: 'tool_call',
        content: value.content,
        order: blockOrder,
      });

      controller.enqueue(
        `{"type":"tool-input-start","toolCallId":"${toolCallBlockId}","toolName":"tool_call"}\n`
      );

      // Check if tool call JSON is complete in this chunk
      if (value.content.endsWith('}')) {
        try {
          const parsedToolCall = JSON.parse(value.content);
          if (parsedToolCall.name && parsedToolCall.args && parsedToolCall.id) {
            const block = currentBlocks.get(toolCallBlockId);
            if (block) {
              block.toolCallId = parsedToolCall.id;
              block.toolName = parsedToolCall.name;
              block.metadata = { args: parsedToolCall.args };
            }

            controller.enqueue(
              `{"type":"tool-input-available","toolCallId":"${parsedToolCall.id}","toolName":"${parsedToolCall.name}","input":${JSON.stringify(parsedToolCall.args)}}\n`
            );
          }
        } catch {
          controller.enqueue(
            `{"type":"tool-input-available","toolCallId":"${toolCallBlockId}","toolName":"tool_call","input":${JSON.stringify({ content: value.content })}}\n`
          );
        }
      }
      // If not complete, we'll accumulate in subsequent chunks in the regular text handler
    }
  }

  // 7. Handle tool results (using tool_calls field to identify tool results)
  if (
    !hasSpecialContent &&
    value.tool_calls &&
    value.tool_calls.length > 0 &&
    value.content
  ) {
    const contentStr = contentToString(value.content);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const toolResultBlockId = randomUUID();

    currentBlocks.set(toolResultBlockId, {
      id: toolResultBlockId,
      type: 'tool_result',
      content: contentStr,
      order: blockOrder,
      toolCallId: value.tool_calls[0]?.id,
    });

    controller.enqueue(
      `{"type":"tool-output-available","toolCallId":"${value.tool_calls[0]?.id}","output":"${escapeJsonString(contentStr)}"}\n`
    );
  }

  // 8. Handle source content
  if (!hasSpecialContent && value.additional_kwargs?.source) {
    const sourceContent = contentToString(value.additional_kwargs.source);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const sourceBlockId = randomUUID();

    currentBlocks.set(sourceBlockId, {
      id: sourceBlockId,
      type: 'source',
      content: sourceContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
      },
    });

    controller.enqueue(
      `{"type":"source","content":"${escapeJsonString(sourceContent)}"}\n`
    );
  }

  // 9. Handle file content
  if (!hasSpecialContent && value.additional_kwargs?.file) {
    const fileContent = contentToString(value.additional_kwargs.file);
    hasSpecialContent = true;
    incrementBlockOrder = true;
    const fileBlockId = randomUUID();

    currentBlocks.set(fileBlockId, {
      id: fileBlockId,
      type: 'file',
      content: fileContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
      },
    });

    controller.enqueue(
      `{"type":"file","content":"${escapeJsonString(fileContent)}"}\n`
    );
  }

  // 10. Handle regular text content (fallback)
  if (
    !hasSpecialContent &&
    value.content &&
    typeof value.content === 'string'
  ) {
    if (!currentTextBlockId) {
      newTextBlockId = randomUUID();
      currentBlocks.set(newTextBlockId, {
        id: newTextBlockId,
        type: 'text',
        content: '',
        order: blockOrder,
      });

      controller.enqueue(`{"type":"text-start","id":"${newTextBlockId}"}\n`);
    }

    const block = currentBlocks.get(newTextBlockId!);
    if (block) {
      block.content += value.content;

      // If this is a tool call block, check if JSON is now complete
      if (block.type === 'tool_call' && block.content.endsWith('}')) {
        try {
          const parsedToolCall = JSON.parse(block.content);
          if (parsedToolCall.name && parsedToolCall.args && parsedToolCall.id) {
            block.toolCallId = parsedToolCall.id;
            block.toolName = parsedToolCall.name;
            block.metadata = { args: parsedToolCall.args };

            controller.enqueue(
              `{"type":"tool-input-available","toolCallId":"${parsedToolCall.id}","toolName":"${parsedToolCall.name}","input":${JSON.stringify(parsedToolCall.args)}}\n`
            );
          }
        } catch {
          // If parsing fails, send raw content
          controller.enqueue(
            `{"type":"tool-input-available","toolCallId":"${newTextBlockId}","toolName":"tool_call","input":${JSON.stringify({ content: block.content })}}\n`
          );
        }
        return {
          newTextBlockId: newTextBlockId || undefined,
          incrementBlockOrder,
        }; // Don't send text-delta for tool calls
      }
    }

    // Only send text-delta for actual text content, not tool calls
    if (block && block.type === 'text') {
      controller.enqueue(
        `{"type":"text-delta","delta":"${escapeJsonString(value.content)}","id":"${newTextBlockId}"}\n`
      );
    }
  }

  // 11. Handle error content
  // 11.1. Handle stream error events
  if (!hasSpecialContent && value.additional_kwargs?.stream_error) {
    hasSpecialContent = true;
    const errorMessage =
      value.additional_kwargs.error_message || 'Unknown error';
    controller.enqueue(
      `{"type":"stream-error","error":"${escapeJsonString(String(errorMessage))}"}\n`
    );
  }
  // 11.2. Handle error content and tool errors
  if (
    !hasSpecialContent &&
    (value.additional_kwargs?.error || value.additional_kwargs?.tool_error)
  ) {
    hasSpecialContent = true;
    incrementBlockOrder = true;

    // Use the content directly if it's an error message, otherwise use the error from additional_kwargs
    const errorContent = value.content
      ? contentToString(value.content)
      : contentToString(value.additional_kwargs.error);

    const errorBlockId = randomUUID();

    currentBlocks.set(errorBlockId, {
      id: errorBlockId,
      type: 'error',
      content: errorContent,
      order: blockOrder,
      metadata: {
        source: 'additional_kwargs',
        tool_error: value.additional_kwargs?.tool_error,
        error_message: value.additional_kwargs?.error_message,
      },
    });

    controller.enqueue(
      `{"type":"error","content":"${escapeJsonString(errorContent)}"}\n`
    );
  }

  // 12. Handle stream completion events
  if (!hasSpecialContent && value.additional_kwargs?.stream_complete) {
    hasSpecialContent = true;
    controller.enqueue(`{"type":"stream-complete"}\n`);
  }

  return {
    newTextBlockId: newTextBlockId || undefined,
    incrementBlockOrder,
  };
}

/**
 * Creates a ReadableStream that processes a LangChain stream directly and stores blocks as separate messages
 * @param stream - The LangChain stream to process
 * @param options - Configuration options for message storage
 */
export function createStoredUIMessageStream(
  stream: ReadableStream<AIMessageChunk>,
  options: StreamingMessageOptions
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const {
        startTime,
        conversationId,
        history = [],
        skipMessageStorage = false,
      } = options;

      // Track current blocks and their content
      const currentBlocks = new Map<string, MessageBlock>();
      let blockOrder = 0;
      let currentTextBlockId: string | null = null;

      // Store blocks asynchronously without blocking the stream
      const storeBlocks = async (blocks: MessageBlock[]) => {
        if (skipMessageStorage || blocks.length === 0) {
          return;
        }

        try {
          const now = new Date();
          const processingTimeMs = startTime ? Date.now() - startTime : 0;

          // Calculate usage for all blocks combined
          const totalContent = blocks.map((b) => b.content).join('\n');
          let costUSD = 0;
          let inputTokens = 0;
          let outputTokens = 0;
          let totalTokens = 0;

          if (options.modelProvider && options.model) {
            const costCalculation = llmService.calculateUsage(
              history,
              totalContent,
              options.modelProvider,
              options.model
            );
            costUSD = costCalculation.totalCost;
            inputTokens = costCalculation.inputTokens;
            outputTokens = costCalculation.outputTokens;
            totalTokens = costCalculation.totalTokens;
          }

          // Distribute cost proportionally across blocks
          const costPerBlock = costUSD / blocks.length;
          const tokensPerBlock = Math.floor(totalTokens / blocks.length);

          let firstMessageId: string | null = null;

          const messagePromises = blocks.map((block, index) => {
            const messageId = randomUUID();

            // Capture the first message ID for analytics
            if (index === 0) {
              firstMessageId = messageId;
            }

            const message: NewMessage = {
              id: messageId,
              conversationId,
              role: 'assistant',
              content: block.content,
              messageType: block.type as
                | 'text'
                | 'tool_call'
                | 'tool_result'
                | 'reasoning'
                | 'source'
                | 'file'
                | 'error'
                | 'system',
              blockId: block.id,
              parentBlockId: block.parentBlockId,
              blockOrder: block.order,
              aiModelId: options.model || null,
              modelProvider: options.modelProvider || null,
              modelName: options.model || null,
              agentName: options.agentName || null,
              inputTokens: Math.floor(inputTokens / blocks.length),
              outputTokens: Math.floor(outputTokens / blocks.length),
              totalTokens: tokensPerBlock,
              processingTimeMs: Math.floor(processingTimeMs / blocks.length),
              costUSD: costPerBlock,
              metadata: block.metadata || {},
              createdAt: now,
              updatedAt: now,
            };

            return db.insert(messages).values(message);
          });

          await Promise.all(messagePromises);

          // Update conversation updated timestamp
          await db
            .update(conversations)
            .set({ updatedAt: now })
            .where(eq(conversations.id, conversationId));

          // Log analytics for the first block (representing the overall response)
          if (blocks.length > 0 && firstMessageId) {
            await analyticsService.logAgentUsed(
              conversationId,
              firstMessageId,
              options.agentName
            );
          }
        } catch (error) {
          console.error('Error storing message blocks:', error);
        }
      };

      try {
        const reader = stream.getReader();
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (!done && value) {
            // Process all possible content types in priority order
            const processed = processContentChunk(value, {
              currentBlocks,
              currentTextBlockId,
              blockOrder,
              controller,
            });

            // Update state based on processing results
            if (processed.newTextBlockId) {
              currentTextBlockId = processed.newTextBlockId;
            }
            if (processed.incrementBlockOrder) {
              blockOrder++;
            }
          }
        }

        // Finalize any remaining blocks
        if (currentTextBlockId) {
          controller.enqueue(
            `{"type":"text-end","id":"${currentTextBlockId}"}\n`
          );
        }

        // Store all blocks
        const blocksToStore = Array.from(currentBlocks.values());
        if (blocksToStore.length > 0) {
          await storeBlocks(blocksToStore);
        }

        controller.close();
      } catch (error) {
        console.error('Error processing stream:', error);
        // Send error event before closing
        controller.enqueue(
          `{"type":"stream-error","error":"${String(error).replace(/"/g, '\\"')}"}\n`
        );
        controller.error(error);
      }
    },
  });
}

/**
 * Process a streaming response and return either a stream or collected results
 * This allows us to use the same logic for both streaming and non-streaming responses
 */
export async function processStreamingResponse(
  stream: ReadableStream<AIMessageChunk>,
  options: StreamingMessageOptions & {
    returnStream?: boolean;
    userMessageId?: string;
  }
): Promise<{
  stream?: ReadableStream;
  messages?: Array<{
    id: string;
    conversationId: string;
    role: 'assistant';
    content: string;
    messageType:
      | 'text'
      | 'tool_call'
      | 'tool_result'
      | 'reasoning'
      | 'source'
      | 'file'
      | 'error'
      | 'system';
    blockId: string | null;
    parentBlockId: string | null;
    blockOrder: number;
    aiModelId: string | null;
    modelProvider: string | null;
    modelName: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    costUSD: number | null;
    processingTimeMs: number | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }>;
}> {
  if (options.returnStream) {
    // Return streaming response
    const readableStream = createStoredUIMessageStream(stream, options);
    return { stream: readableStream };
  } else {
    // Collect results for non-streaming response
    const currentBlocks = new Map<string, MessageBlock>();
    let blockOrder = 0;
    let currentTextBlockId: string | null = null;

    const reader = stream.getReader();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (!done && value) {
        // Process LangChain AIMessageChunk directly
        if (value.content && typeof value.content === 'string') {
          // Handle text content
          if (!currentTextBlockId) {
            currentTextBlockId = `text-${Date.now()}-${Math.random()}`;
            currentBlocks.set(currentTextBlockId, {
              id: currentTextBlockId,
              type: 'text',
              content: '',
              order: blockOrder++,
            });
          }

          const block = currentBlocks.get(currentTextBlockId);
          if (block) {
            block.content += value.content;
          }
        }

        // Handle tool calls
        if (value.tool_calls && value.tool_calls.length > 0) {
          for (const toolCall of value.tool_calls) {
            const toolCallBlockId = `tool-call-${Date.now()}-${Math.random()}`;
            currentBlocks.set(toolCallBlockId, {
              id: toolCallBlockId,
              type: 'tool_call',
              content: JSON.stringify(toolCall),
              order: blockOrder++,
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              metadata: {
                args: toolCall.args,
              },
            });
          }
        }
      }
    }

    // Convert blocks to messages
    const messages = Array.from(currentBlocks.values()).map((block) => ({
      id: randomUUID(),
      conversationId: options.conversationId,
      role: 'assistant' as const,
      content: block.content,
      messageType: block.type,
      blockId: block.id,
      parentBlockId: block.parentBlockId || null,
      blockOrder: block.order,
      aiModelId: options.model || null,
      modelProvider: options.modelProvider || null,
      modelName: options.model || null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costUSD: null,
      processingTimeMs: null,
      metadata: block.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return { messages };
  }
}

/**
 * Apply streaming-friendly headers to the response
 */
export function applyStreamingHeaders(
  reply: { header: (key: string, value: string) => void },
  customHeaders: Record<string, string> = {}
) {
  reply.header('Content-Type', 'text/plain; charset=utf-8');
  reply.header('Cache-Control', 'no-cache');
  reply.header('Connection', 'keep-alive');
  reply.header('Transfer-Encoding', 'chunked');

  // Add custom headers
  Object.entries(customHeaders).forEach(([key, value]) => {
    reply.header(key, value);
  });
}
