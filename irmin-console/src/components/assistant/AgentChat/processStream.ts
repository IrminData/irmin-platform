import type { LangChainStreamEvent } from './langchainStreamTypes';
import {
  extractTextFromContent,
  extractThinkingFromContent,
} from './langchainStreamTypes';
import type { ServerStreamEvent } from './types';

interface ToolCallState {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// Process LangChain streaming response chunks
export const processStream = async (
  stream: ReadableStream,
  signal?: AbortSignal,
  onContentUpdate?: (content: string) => void,
  onPartsUpdate?: (parts: ServerStreamEvent[]) => void
): Promise<{ content: string; parts: ServerStreamEvent[] }> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = '';
  const parts: ServerStreamEvent[] = [];
  const toolCalls = new Map<string, ToolCallState>();
  let accumulatedThinking = '';
  let thinkingEventIndex = -1;

  try {
    while (true) {
      if (signal?.aborted) {
        reader.releaseLock();
        return { content, parts };
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as LangChainStreamEvent;

          switch (parsed.event) {
            case 'on_chat_model_stream': {
              // Extract text content from the chunk
              const chunkContent = parsed.data.chunk?.kwargs.content;
              const text = extractTextFromContent(chunkContent);

              if (text) {
                content += text;
                onContentUpdate?.(content);
              }

              // Extract thinking blocks from the chunk and accumulate them
              const thinkingBlocks = extractThinkingFromContent(chunkContent);
              for (const thinkingDelta of thinkingBlocks) {
                accumulatedThinking += thinkingDelta;

                // Update or create the reasoning event with accumulated content
                if (thinkingEventIndex === -1) {
                  // Create a new reasoning event
                  const thinkingId = `thinking-${Date.now()}`;
                  thinkingEventIndex = parts.length;
                  parts.push({
                    type: 'reasoning-end',
                    id: thinkingId,
                    delta: accumulatedThinking,
                  });
                } else {
                  // Update the existing reasoning event
                  const existingEvent = parts[thinkingEventIndex];
                  if (existingEvent.type === 'reasoning-end') {
                    parts[thinkingEventIndex] = {
                      type: 'reasoning-end',
                      id: existingEvent.id,
                      delta: accumulatedThinking,
                    };
                  }
                }
                onPartsUpdate?.(parts);
              }

              // Check for tool calls in the chunk
              const toolCallsData =
                parsed.data.chunk?.kwargs.additional_kwargs?.tool_calls;
              if (toolCallsData && Array.isArray(toolCallsData)) {
                for (const toolCall of toolCallsData) {
                  if (toolCall.type === 'function') {
                    try {
                      const args = JSON.parse(toolCall.function.arguments);
                      toolCalls.set(toolCall.id, {
                        id: toolCall.id,
                        name: toolCall.function.name,
                        args,
                      });

                      // Add tool input event if not already added
                      const existingInputIndex = parts.findIndex(
                        (p) =>
                          p.type === 'tool-input-available' &&
                          p.toolCallId === toolCall.id
                      );
                      if (existingInputIndex === -1) {
                        parts.push({
                          type: 'tool-input-available',
                          toolCallId: toolCall.id,
                          toolName: toolCall.function.name,
                          input: args,
                        });
                        onPartsUpdate?.(parts);
                      }
                    } catch {
                      // Failed to parse tool call arguments
                    }
                  }
                }
              }
              break;
            }

            case 'on_tool_start': {
              // Tool execution started
              const toolName = parsed.name;
              const runId = parsed.run_id;
              if (toolName && runId) {
                const existingToolCall = toolCalls.get(runId);
                if (!existingToolCall) {
                  // If we don't have the tool call from chat model stream,
                  // add it now from the tool start event
                  const input = parsed.data.input || {};
                  parts.push({
                    type: 'tool-input-available',
                    toolCallId: runId,
                    toolName,
                    input,
                  });
                  onPartsUpdate?.(parts);
                }
              }
              break;
            }

            case 'on_tool_end': {
              // Tool execution completed
              const toolOutput = parsed.data.output;
              const runId = parsed.run_id;
              if (runId && toolOutput !== undefined) {
                const outputString =
                  typeof toolOutput === 'string'
                    ? toolOutput
                    : JSON.stringify(toolOutput);

                const existingOutputIndex = parts.findIndex(
                  (p) =>
                    p.type === 'tool-output-available' && p.toolCallId === runId
                );
                if (existingOutputIndex === -1) {
                  parts.push({
                    type: 'tool-output-available',
                    toolCallId: runId,
                    output: outputString,
                  });
                  onPartsUpdate?.(parts);
                }
              }
              break;
            }

            case 'on_chat_model_end': {
              // Chat model finished - could extract usage metadata here if needed
              break;
            }

            case 'on_chain_start':
            case 'on_chain_end':
            case 'on_chat_model_start':
              // These events don't need specific handling for UI rendering
              break;

            default:
              break;
          }
        } catch (error) {
          // If JSON parsing fails, skip this line
          console.warn('Failed to parse stream line:', error);
          continue;
        }
      }
    }
  } catch (error) {
    // Stream error
    console.error('Stream processing error:', error);
    parts.push({
      type: 'stream-error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    onPartsUpdate?.(parts);
  } finally {
    reader.releaseLock();
  }

  return { content, parts };
};
