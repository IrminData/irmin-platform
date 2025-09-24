import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  BaseMessageChunk,
  type InvalidToolCall,
  isAIMessage,
  isAIMessageChunk,
  isBaseMessage,
  isToolMessage,
  isToolMessageChunk,
} from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import { analyticsService } from '@/services/analytics';
import { type LLMProvider, llmService } from '@/services/llm';
import { mcpService } from '@/services/mcp';

import { DEFAULT_LLM_CONFIG } from '@/config/defaults';
import { TIMEOUTS } from '@/config/timeouts';

import type { CompletionOptions } from './completion';

// Define the state of our agent
interface AgentState {
  messages: BaseMessage[];
  toolCalls: number;
  maxToolCalls: number;
  currentIteration: number;
  [key: string]: unknown; // Index signature for LangGraph compatibility
}

class AgentGraphService {
  /**
   * Create and execute a streaming LangGraph agent
   */
  async executeAgentStream(
    options: CompletionOptions
  ): Promise<IterableReadableStream<AIMessageChunk>> {
    try {
      // Get MCP tools if enabled
      const tools = options.toolSelection
        ? await mcpService.createMcpTools(
            options.authToken,
            options.toolSelection
          )
        : [];

      console.log(`Agent graph: Loaded ${tools.length} MCP tools`);

      // Convert messages to LangChain format
      const langchainMessages = llmService.convertMessagesToLangChain(
        options.messages,
        options.systemPrompt
      );

      // Create the agent graph
      const graph = this.createAgentGraph({
        provider: options.provider || DEFAULT_LLM_CONFIG.provider,
        model:
          options.model ||
          llmService.getDefaultModels()[
            options.provider || DEFAULT_LLM_CONFIG.provider
          ],
        temperature: options.temperature || DEFAULT_LLM_CONFIG.temperature,
        maxTokens: options.maxTokens || DEFAULT_LLM_CONFIG.maxTokens,
        tools,
      });

      // Initial state
      const initialState: AgentState = {
        messages: langchainMessages,
        toolCalls: 0,
        maxToolCalls: options.maxToolCalls || DEFAULT_LLM_CONFIG.maxToolCalls,
        currentIteration: 0,
      };

      // Stream the graph execution - use only messages to avoid conflicts
      const stream = await graph.stream(initialState, {
        streamMode: ['messages'], // Use only message streaming to avoid duplicate processing
      });

      // Convert the agent graph stream to AIMessageChunk stream
      return this.convertAgentGraphToAIMessageChunkStream(
        stream as unknown as Awaited<
          ReturnType<ReturnType<typeof this.createAgentGraph>['stream']>
        >
      );
    } catch (error) {
      await analyticsService.logError(
        'agent_graph_stream',
        error instanceof Error ? error.message : 'Unknown error',
        options.conversationId,
        undefined
      );

      console.error('Agent graph stream error:', error);
      throw new Error(
        `Failed to execute agent graph stream: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert agent graph stream to AIMessageChunk stream with real-time token streaming
   */
  private convertAgentGraphToAIMessageChunkStream(
    agentStream: Awaited<
      ReturnType<ReturnType<typeof this.createAgentGraph>['stream']>
    >
  ): IterableReadableStream<AIMessageChunk> {
    return new ReadableStream({
      async start(controller) {
        let toolCallCount = 0;
        let iterationCount = 0;

        try {
          for await (const chunk of agentStream) {
            // Handle LangGraph stream format: ["messages", [messages_array]]
            if (
              Array.isArray(chunk) &&
              chunk.length === 2 &&
              chunk[0] === 'messages'
            ) {
              const newMessages = chunk[1]; // This is an array of new messages from the last step
              if (Array.isArray(newMessages) && newMessages.length > 0) {
                // Process all new messages from the agent graph
                for (const msg of newMessages) {
                  // Use proper type guards instead of instanceof
                  if (!isBaseMessage(msg)) {
                    continue;
                  }

                  // Helper function to safely extract content as string
                  const getContentAsString = (content: unknown): string => {
                    if (typeof content === 'string') return content;
                    if (Array.isArray(content)) {
                      return content
                        .map((item) => {
                          if (typeof item === 'string') return item;
                          if (typeof item === 'object' && item !== null) {
                            // Check if this is a Claude content block with text
                            if (
                              'type' in item &&
                              'text' in item &&
                              item.type === 'text'
                            ) {
                              return String(item.text);
                            }
                            // For other objects, convert to JSON
                            return JSON.stringify(item);
                          }
                          return String(item);
                        })
                        .join('');
                    }
                    if (typeof content === 'object' && content !== null) {
                      // Check if this is a single Claude content block with text
                      if (
                        'type' in content &&
                        'text' in content &&
                        content.type === 'text'
                      ) {
                        return String((content as { text: unknown }).text);
                      }
                      return JSON.stringify(content);
                    }
                    return String(content);
                  };

                  let chunkToEnqueue: AIMessageChunk;

                  // Check if it's a ToolMessage (result of tool execution) using type guard
                  if (isToolMessage(msg)) {
                    // Convert ToolMessage to AIMessageChunk with tool_result metadata
                    chunkToEnqueue = new AIMessageChunk({
                      content: msg.content,
                      additional_kwargs: {
                        tool_result: true,
                        tool_call_id: msg.tool_call_id,
                        ...msg.additional_kwargs,
                      },
                    });
                  } else if (isToolMessageChunk(msg as BaseMessageChunk)) {
                    // Handle ToolMessageChunk directly
                    chunkToEnqueue = new AIMessageChunk({
                      content: msg.content,
                      additional_kwargs: {
                        tool_result: true,
                        tool_call_id: (
                          msg as BaseMessageChunk & { tool_call_id?: string }
                        ).tool_call_id,
                        ...msg.additional_kwargs,
                      },
                    });
                  } else if (isAIMessage(msg)) {
                    // Convert AIMessage to AIMessageChunk
                    const contentString = getContentAsString(msg.content);
                    chunkToEnqueue = new AIMessageChunk({
                      content: contentString,
                      additional_kwargs: msg.additional_kwargs,
                    });
                  } else if (isAIMessageChunk(msg as BaseMessageChunk)) {
                    // It's already an AIMessageChunk, use it directly
                    chunkToEnqueue = msg as AIMessageChunk;
                  } else {
                    // Fallback for other message types, convert to generic AIMessageChunk
                    chunkToEnqueue = new AIMessageChunk({
                      content: getContentAsString(msg.content || ''),
                      additional_kwargs: {
                        raw_message_type: msg._getType?.() || 'unknown',
                        ...(msg.additional_kwargs || {}),
                      },
                    });
                  }

                  // Enqueue the processed message chunk
                  controller.enqueue(chunkToEnqueue);
                }

                // Track metadata - look for state information in the messages
                // Note: LangGraph's streamMode: ['messages'] format doesn't include explicit metadata
                // but we can extract tool call counts from the state if available
                for (const msg of newMessages) {
                  const msgWithState = msg as BaseMessage & {
                    toolCalls?: number;
                    currentIteration?: number;
                  };
                  if (msgWithState.toolCalls) {
                    toolCallCount = Math.max(
                      toolCallCount,
                      msgWithState.toolCalls
                    );
                  }
                  if (msgWithState.currentIteration) {
                    iterationCount = Math.max(
                      iterationCount,
                      msgWithState.currentIteration
                    );
                  }
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Agent graph stream conversion error:', error);
          controller.error(error);
        }
      },
    }) as IterableReadableStream<AIMessageChunk>;
  }

  /**
   * Create the agent graph with ReAct pattern
   */
  private createAgentGraph(options: {
    provider: LLMProvider;
    model: string;
    temperature: number;
    maxTokens: number;
    tools: StructuredTool[];
  }) {
    const { provider, model, temperature, maxTokens, tools } = options;

    // Create the LLM with tools
    console.log(
      `🔧 Creating agent graph with ${tools.length} tools (${provider}/${model})`
    );

    const llm = llmService.createModel({
      provider,
      model,
      temperature,
      maxTokens,
      tools,
    });

    // Create tool node if we have tools with error handling
    const toolNode = tools.length > 0 ? new ToolNode(tools) : null;

    // Create a custom tool execution function that handles errors
    async function callTools(state: AgentState) {
      if (!toolNode) {
        return { messages: [] };
      }

      try {
        // Get the last message to see what tool calls need to be executed
        const lastMessage = state.messages[state.messages.length - 1];

        if (!isBaseMessage(lastMessage)) {
          console.warn('callTools: Last message is not a BaseMessage');
          return { messages: [] };
        }

        if (!isAIMessage(lastMessage)) {
          console.warn(
            'callTools: Last message is not an AIMessage, cannot extract tool calls'
          );
          return { messages: [] };
        }

        // Execute tools using the ToolNode
        const result = await toolNode.invoke(state, {
          maxConcurrency: 5,
          timeout: TIMEOUTS.MCP_TOOL_EXECUTION,
        });

        // Increment tool calls counter
        return {
          ...result,
          toolCalls: state.toolCalls + 1,
          maxToolCalls: state.maxToolCalls,
          currentIteration: state.currentIteration,
        };
      } catch (error) {
        // If tool execution fails, provide feedback to the LLM so it can retry with correct parameters
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Create a system message that explains the error and asks the LLM to retry
        const feedbackMessage = new AIMessage({
          content: `Tool call failed with error: ${errorMessage}. Please analyze the error and retry the tool call with the correct parameters. Make sure to include all required parameters in the proper format. Use the proper tool calling mechanism, not JSON text.`,
          additional_kwargs: {
            tool_call_feedback: true,
            original_error: errorMessage,
          },
        });

        return {
          messages: [feedbackMessage],
          toolCalls: state.toolCalls + 1, // Increment tool calls to track retries
          maxToolCalls: state.maxToolCalls,
          currentIteration: state.currentIteration,
        };
      }
    }

    // Define the function that determines whether to continue or not
    function shouldContinue(state: AgentState) {
      const lastMessage = state.messages[state.messages.length - 1];

      // Ensure we have a valid message
      if (!isBaseMessage(lastMessage)) {
        console.warn(
          'shouldContinue: Last message is not a BaseMessage, ending'
        );
        return '__end__';
      }

      // Check if we've hit the max tool calls limit
      if (state.toolCalls >= state.maxToolCalls) {
        return '__end__';
      }

      // If the last message is feedback for retry, stay in agent node for retry
      if (lastMessage.additional_kwargs?.tool_call_feedback) {
        return 'agent';
      }

      // Check if it's an AI message with tool calls
      if (isAIMessage(lastMessage)) {
        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
          // Check if we've made the exact same tool calls in the immediate previous AI message
          // This prevents immediate loops while allowing legitimate tool call sequences
          const currentToolCalls = lastMessage.tool_calls.map((tc) => tc.name);

          // Look for the most recent AI message with tool calls (excluding the current one)
          const previousAIMessage = state.messages
            .slice(0, -1) // Exclude the current message
            .reverse()
            .find((msg) => isAIMessage(msg) && msg.tool_calls?.length) as
            | AIMessage
            | undefined;

          // Simple loop detection: check for immediate duplicates
          if (previousAIMessage) {
            const previousToolCalls =
              previousAIMessage.tool_calls?.map((tc) => tc.name) || [];

            // Only check for exact duplicates in the immediate previous AI message
            if (
              previousToolCalls.length === currentToolCalls.length &&
              previousToolCalls.length > 0 &&
              previousToolCalls.every(
                (tc, index) => tc === currentToolCalls[index]
              )
            ) {
              // Check how many times we've seen this exact sequence recently
              const duplicateCount = state.messages
                .slice(-6) // Look at last 6 messages
                .filter((msg) => isAIMessage(msg) && msg.tool_calls?.length)
                .filter((msg) => {
                  const msgToolCalls =
                    (msg as AIMessage).tool_calls?.map((tc) => tc.name) || [];
                  return (
                    msgToolCalls.length === currentToolCalls.length &&
                    msgToolCalls.every(
                      (tc, index) => tc === currentToolCalls[index]
                    )
                  );
                }).length;

              // Allow up to 3 attempts before ending
              if (duplicateCount >= 3) {
                return '__end__';
              }
            }
          }

          return 'tools';
        } else {
          // AI message without tool calls - this should be the final response
          return '__end__';
        }
      }

      // For other message types (like ToolMessage), continue to agent to process
      return 'agent';
    }

    // Define function to determine what to do after tool execution
    function shouldContinueAfterTools(state: AgentState) {
      const lastMessage = state.messages[state.messages.length - 1];

      // Ensure we have a valid message
      if (!isBaseMessage(lastMessage)) {
        console.warn(
          'shouldContinueAfterTools: Last message is not a BaseMessage, ending'
        );
        return '__end__';
      }

      // If the last message is feedback for retry, go back to agent
      if (lastMessage.additional_kwargs?.tool_call_feedback) {
        return 'agent';
      }

      // If we've hit the max tool calls limit, end
      if (state.toolCalls >= state.maxToolCalls) {
        return '__end__';
      }

      // After successful tool execution, always go back to agent to process the results
      return 'agent';
    }

    // Define the function that calls the model with streaming support
    async function callModel(state: AgentState) {
      try {
        // For real-time streaming, we need to handle this differently
        // LangGraph doesn't support streaming within nodes, so we'll use invoke
        // and handle streaming at the graph level
        const response = await llm.invoke(state.messages);
        // Handle response based on whether it has tool calls

        // Handle invalid tool calls if any
        if (
          response.invalid_tool_calls &&
          response.invalid_tool_calls.length > 0
        ) {
          // Create feedback message to help the LLM retry with correct parameters
          const invalidCallDetails = response.invalid_tool_calls
            .map(
              (call: InvalidToolCall) =>
                `Tool "${call.name}" (ID: ${call.id}): ${call.error || 'Invalid parameters'}`
            )
            .join('; ');

          const feedbackMessage = new AIMessage({
            content: `Invalid tool calls detected: ${invalidCallDetails}. Please retry the tool calls with the correct parameters according to the tool schemas.`,
            additional_kwargs: {
              tool_call_feedback: true,
              invalid_tool_calls: response.invalid_tool_calls,
              original_error: 'Invalid tool call parameters',
            },
          });

          return {
            messages: [feedbackMessage],
            currentIteration: state.currentIteration + 1,
            toolCalls: state.toolCalls + 1,
          };
        }

        // Check if the model is generating JSON tool calls as text content instead of using proper tool_calls
        if (
          response.content &&
          typeof response.content === 'string' &&
          !response.tool_calls?.length &&
          (response.content.includes('{"name"') ||
            response.content.includes('"type":"tool_call"'))
        ) {
          // Create feedback message to instruct the model to use proper tool calling
          const feedbackMessage = new AIMessage({
            content: `Please use the proper tool calling mechanism instead of generating JSON as text. When you need to call a tool, use the structured tool calling format, not JSON text output.`,
            additional_kwargs: {
              tool_call_feedback: true,
              original_error:
                'Model generated JSON tool call as text instead of using proper tool_calls',
            },
          });

          return {
            messages: [feedbackMessage],
            currentIteration: state.currentIteration + 1,
            toolCalls: state.toolCalls + 1,
          };
        }

        return {
          messages: [response],
          currentIteration: state.currentIteration + 1,
        };
      } catch (error) {
        // If the LLM call fails due to tool validation, provide feedback for retry
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Check if this is a tool validation error that we can retry
        if (
          errorMessage.includes('tool call validation failed') ||
          errorMessage.includes('parameters for tool')
        ) {
          // Create feedback message to help the LLM retry with correct parameters
          const feedbackMessage = new AIMessage({
            content: `Tool call failed with validation error: ${errorMessage}. Please retry the tool call with the correct parameters. Make sure to include all required parameters according to the tool schema.`,
            additional_kwargs: {
              tool_call_feedback: true,
              original_error: errorMessage,
              retry_request: true,
            },
          });

          return {
            messages: [feedbackMessage],
            currentIteration: state.currentIteration + 1,
            toolCalls: state.toolCalls + 1, // Increment to track retry attempts
          };
        } else {
          // For other errors, create a regular error message
          const errorMessageAI = new AIMessage({
            content: `Error in model call: ${errorMessage}`,
            additional_kwargs: {
              error: true,
              error_message: errorMessage,
            },
          });

          return {
            messages: [errorMessageAI],
            currentIteration: state.currentIteration + 1,
          };
        }
      }
    }

    // Create the graph using Annotation
    const GraphState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
      }),
      toolCalls: Annotation<number>({
        reducer: (x: number, y: number) => y ?? x,
        default: () => 0,
      }),
      maxToolCalls: Annotation<number>({
        reducer: (x: number, y: number) => y ?? x,
        default: () => 10,
      }),
      currentIteration: Annotation<number>({
        reducer: (x: number, y: number) => y ?? x,
        default: () => 0,
      }),
    });

    const workflow = new StateGraph(GraphState);

    // Add nodes
    workflow.addNode('agent', callModel);

    if (tools.length > 0 && toolNode) {
      workflow.addNode('tools', callTools);
    }

    // Set entry point and add edges with proper type handling
    workflow.addEdge(START, 'agent' as never);

    if (tools.length > 0 && toolNode) {
      workflow.addConditionalEdges('agent' as never, shouldContinue, {
        agent: 'agent' as never, // Allow agent to route back to itself for retries
        tools: 'tools' as never,
        __end__: END,
      } as never);

      // After tools execute, we need to decide whether to continue or end
      workflow.addConditionalEdges('tools' as never, shouldContinueAfterTools, {
        agent: 'agent' as never, // Go back to agent if there's feedback to process
        __end__: END,
      } as never);
    } else {
      workflow.addEdge('agent' as never, END);
    }

    return workflow.compile();
  }
}

// Export singleton instance
export const agentGraphService = new AgentGraphService();
