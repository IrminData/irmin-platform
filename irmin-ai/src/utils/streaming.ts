import {
  conversations,
  db,
  type Message,
  messages,
  type NewMessage,
} from '@/database';
import { AIMessageChunk } from '@langchain/core/messages';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

import { analyticsService } from '@/services/analytics';
import { llmService } from '@/services/llm';
import type { LLMProvider } from '@/services/llm';
// eslint-disable-next-line import-x/no-cycle
import { titleGenerationService } from '@/services/titleGeneration';

import { TIMEOUTS } from '@/config/timeouts';

interface StreamingMessageOptions {
  conversationId: string;
  startTime?: number;
  modelProvider?: LLMProvider;
  model?: string;
  agentName?: string;
  history?: NewMessage[] | Message[];
  skipMessageStorage?: boolean;
  // Title generation options
  userMessage?: string;
  user?: { id: string };
  workspace?: { slug: string };
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

  // Handle JSON tool calls in content - detect Claude/Anthropic format and LangGraph format
  if (
    !hasSpecialContent &&
    value.content &&
    typeof value.content === 'string' &&
    !value.tool_calls?.length
  ) {
    const content = value.content;

    // Detect various tool call patterns
    const isAnthropicToolCall =
      content.includes('"type":"tool_use"') &&
      content.includes('"name"') &&
      content.includes('"id"');

    const isLangChainToolCall =
      content.startsWith('{"name"') ||
      (content.includes('"name"') && content.includes('"args"'));

    const isToolInputDelta =
      content.includes('"type":"input_json_delta"') &&
      content.includes('"input"');

    if (isAnthropicToolCall || isLangChainToolCall || isToolInputDelta) {
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

      // Try to parse tool call details
      try {
        const parsed = JSON.parse(content);

        // Handle Anthropic format
        if (parsed.type === 'tool_use' && parsed.name && parsed.id) {
          const block = currentBlocks.get(toolCallBlockId);
          if (block) {
            block.toolCallId = parsed.id;
            block.toolName = parsed.name;
            block.metadata = { args: parsed.input || {} };
          }
          controller.enqueue(
            `{"type":"tool-input-available","toolCallId":"${parsed.id}","toolName":"${parsed.name}","input":${JSON.stringify(parsed.input || {})}}\n`
          );
        }
        // Handle LangChain format
        else if (parsed.name && parsed.args) {
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
        // Handle input delta chunks - these are part of ongoing tool calls, just ignore them
        else if (parsed.type === 'input_json_delta') {
          // These are streaming chunks for tool input, we can safely ignore them
          // as the complete tool call was already processed
        }
      } catch {
        // Not parseable JSON yet, will continue accumulating
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

  // 8. Handle source content - both explicit sources and citation patterns
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

  // 8.1. Handle source citations in text content
  if (
    !hasSpecialContent &&
    value.content &&
    typeof value.content === 'string'
  ) {
    // Detect source citation patterns like [doc: irmin://docs/category], [Sources: ...], etc.
    const sourceCitationRegex = /\[(doc:|sources?:?)\s*([^\]]+)\]/gi;
    const matches = Array.from(value.content.matchAll(sourceCitationRegex));

    if (matches.length > 0) {
      hasSpecialContent = true;
      incrementBlockOrder = true;

      // Extract sources and create source blocks
      let currentOrder = blockOrder;
      for (const match of matches) {
        const fullMatch = match[0];
        const sourceType = match[1];
        const sourceContent = match[2].trim();

        const sourceBlockId = randomUUID();
        currentBlocks.set(sourceBlockId, {
          id: sourceBlockId,
          type: 'source',
          content: sourceContent,
          order: currentOrder++, // Increment order for each source
          metadata: {
            source: 'text_citation',
            citation_type: sourceType,
            original_text: fullMatch,
          },
        });

        controller.enqueue(
          `{"type":"source","content":"${escapeJsonString(sourceContent)}"}\n`
        );
      }

      // Remove citations from the content and continue processing as text
      const contentWithoutCitations = value.content
        .replace(sourceCitationRegex, '')
        .trim();
      if (contentWithoutCitations) {
        // Create a new chunk with the cleaned content
        const cleanedChunk = new AIMessageChunk({
          content: contentWithoutCitations,
          additional_kwargs: value.additional_kwargs,
        });

        // Update context with new block order and process the cleaned content
        const updatedContext = {
          ...context,
          blockOrder: currentOrder, // Use the updated blockOrder after sources
        };
        return processContentChunk(cleanedChunk, updatedContext);
      }

      return {
        newTextBlockId: newTextBlockId || undefined,
        incrementBlockOrder: false, // We already incremented in the loop
      };
    }
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
    // Check if we need a new text block (either none exists or current is not a text block)
    const currentBlock = currentTextBlockId
      ? currentBlocks.get(currentTextBlockId)
      : null;
    const needsNewTextBlock =
      !currentTextBlockId || !currentBlock || currentBlock.type !== 'text';

    if (needsNewTextBlock) {
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

          // Add timeout to database operations to prevent hanging
          const dbOperations = Promise.all([
            Promise.all(messagePromises),
            db
              .update(conversations)
              .set({ updatedAt: now })
              .where(eq(conversations.id, conversationId)),
          ]);

          // Race against timeout
          await Promise.race([
            dbOperations,
            new Promise((_resolve, reject) =>
              setTimeout(
                () => reject(new Error('Database operation timeout')),
                TIMEOUTS.DATABASE_OPERATION
              )
            ),
          ]);

          // Log analytics for the first block (representing the overall response)
          if (blocks.length > 0 && firstMessageId) {
            // Don't await analytics to prevent blocking
            analyticsService
              .logAgentUsed(conversationId, firstMessageId, options.agentName)
              .catch((error) => {
                console.error('Error logging analytics:', error);
              });
          }
        } catch (error) {
          console.error('Error storing message blocks:', error);
          // Don't throw the error to prevent stream hanging
        }
      };

      try {
        const reader = stream.getReader();
        let done = false;

        try {
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
        } finally {
          // Always release the reader lock
          try {
            reader.releaseLock();
          } catch (releaseError) {
            console.error('Error releasing stream reader:', releaseError);
          }
        }

        // Finalize any remaining blocks
        if (currentTextBlockId) {
          controller.enqueue(
            `{"type":"text-end","id":"${currentTextBlockId}"}\n`
          );
        }

        // Send completion signal
        controller.enqueue(`{"type":"stream-complete"}\n`);

        // Close the controller immediately to free up the response
        controller.close();

        // Store all blocks asynchronously AFTER closing the stream
        // This prevents database operations from blocking the server
        const blocksToStore = Array.from(currentBlocks.values());
        if (blocksToStore.length > 0) {
          // Use setImmediate to ensure this runs after the stream is fully closed
          setImmediate(() => {
            storeBlocks(blocksToStore).catch((error) => {
              console.error(
                'Error storing blocks after stream completion:',
                error
              );
            });

            // Generate title with AI response context (async, don't wait)
            if (options.userMessage && options.user && options.workspace) {
              const textBlocks = blocksToStore.filter(
                (block) => block.type === 'text'
              );
              const aiResponse = textBlocks
                .map((block) => block.content)
                .join('\n');

              if (aiResponse.trim()) {
                titleGenerationService
                  .updateTitleWithAIResponse(
                    options.conversationId,
                    options.userMessage,
                    aiResponse,
                    {
                      user: options.user,
                      workspace: options.workspace,
                    }
                  )
                  .catch((error) => {
                    console.warn(
                      'Failed to update conversation title with AI response in streaming:',
                      error instanceof Error ? error.message : 'Unknown error'
                    );
                  });
              }
            }
          });
        }
      } catch (error) {
        console.error('Error processing stream:', error);
        try {
          // Send error event before closing
          controller.enqueue(
            `{"type":"stream-error","error":"${String(error).replace(/"/g, '\\"')}"}\n`
          );
          // Close the controller instead of erroring it to prevent server hanging
          controller.close();
        } catch (closeError) {
          console.error('Error closing stream controller:', closeError);
          // Only call controller.error as last resort and catch any exceptions
          try {
            controller.error(error);
          } catch (controllerError) {
            console.error(
              'Failed to error stream controller:',
              controllerError
            );
          }
        }
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

    // Generate title with AI response context (async, don't wait)
    if (options.userMessage && options.user && options.workspace) {
      const textBlocks = Array.from(currentBlocks.values()).filter(
        (block) => block.type === 'text'
      );
      const aiResponse = textBlocks.map((block) => block.content).join('\n');

      if (aiResponse.trim()) {
        titleGenerationService
          .updateTitleWithAIResponse(
            options.conversationId,
            options.userMessage,
            aiResponse,
            {
              user: options.user,
              workspace: options.workspace,
            }
          )
          .catch((error) => {
            console.warn(
              'Failed to update conversation title with AI response in non-streaming:',
              error instanceof Error ? error.message : 'Unknown error'
            );
          });
      }
    }

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
