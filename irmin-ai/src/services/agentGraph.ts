import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  ToolMessage,
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
                // Iterate through ALL new messages, not just the first one
                for (const msg of newMessages) {
                  // Only process if it's an actual message type we expect
                  if (!(msg instanceof BaseMessage)) {
                    // BaseMessage is the common ancestor for AIMessage, ToolMessage etc.
                    continue; // Skip to the next item in newMessages
                  }

                  let chunkToEnqueue: AIMessageChunk;

                  // Check if it's a ToolMessage (result of tool execution)
                  if (msg instanceof ToolMessage) {
                    // Convert ToolMessage to AIMessageChunk with tool_result metadata
                    chunkToEnqueue = new AIMessageChunk({
                      content: msg.content,
                      additional_kwargs: {
                        tool_result: true,
                        tool_call_id: msg.tool_call_id,
                        ...msg.additional_kwargs,
                      },
                    });
                  } else if (
                    msg instanceof AIMessageChunk ||
                    msg instanceof AIMessage
                  ) {
                    // It's already an AIMessageChunk or AIMessage, just enqueue it
                    chunkToEnqueue = msg as AIMessageChunk;
                  } else {
                    // Fallback for other unexpected message types, convert to generic AIMessageChunk
                    console.warn(
                      'Unexpected message type in agent stream (after BaseMessage check):',
                      msg.constructor?.name,
                      msg
                    );
                    chunkToEnqueue = new AIMessageChunk({
                      content: msg.content || '',
                      additional_kwargs: {
                        raw_message_type: msg.constructor?.name,
                        ...((
                          msg as BaseMessage & {
                            additional_kwargs?: Record<string, unknown>;
                          }
                        ).additional_kwargs || {}),
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
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        const toolCallsToExecute =
          lastMessage.tool_calls?.map((tc) => tc.name) || [];

        if (toolCallsToExecute.length > 0) {
          console.log(
            `callTools: Executing ${toolCallsToExecute.length} tool(s): ${toolCallsToExecute.join(', ')}`
          );
        }

        // Execute tools using the ToolNode
        const startTime = Date.now();
        const result = await toolNode.invoke(state, {
          maxConcurrency: 5,
          timeout: TIMEOUTS.MCP_TOOL_EXECUTION,
        });
        const executionTime = Date.now() - startTime;

        if (result.messages?.length) {
          console.log(
            `callTools: Completed in ${executionTime}ms, got ${result.messages.length} result(s)`
          );
        }

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
      const lastMessage = state.messages[
        state.messages.length - 1
      ] as AIMessage;

      // Check if we've hit the max tool calls limit
      if (state.toolCalls >= state.maxToolCalls) {
        console.log('shouldContinue: Max tool calls reached, ending');
        return '__end__';
      }

      // If the last message is feedback for retry, stay in agent node for retry
      if (lastMessage.additional_kwargs?.tool_call_feedback) {
        return 'agent';
      }

      // If the LLM makes a tool call, then we route to the "tools" node
      if (lastMessage.tool_calls?.length) {
        return 'tools';
      }
      // Otherwise, we stop (reply to the user) using the special "__end__" node
      return '__end__';
    }

    // Define function to determine what to do after tool execution
    function shouldContinueAfterTools(state: AgentState) {
      const lastMessage = state.messages[
        state.messages.length - 1
      ] as AIMessage;

      // If the last message is feedback for retry, go back to agent
      if (lastMessage.additional_kwargs?.tool_call_feedback) {
        return 'agent';
      }

      // If we've hit the max tool calls limit, end
      if (state.toolCalls >= state.maxToolCalls) {
        console.log('shouldContinueAfterTools: Max tool calls reached, ending');
        return '__end__';
      }

      // For successful tool results, continue back to agent to process the result
      // The agent can then decide whether to make another tool call or respond to user
      return 'agent';
    }

    // Define the function that calls the model with streaming support
    async function callModel(state: AgentState) {
      try {
        // For real-time streaming, we need to handle this differently
        // LangGraph doesn't support streaming within nodes, so we'll use invoke
        // and handle streaming at the graph level
        const response = await llm.invoke(state.messages);
        // Log tool calls if any
        if (response.tool_calls?.length) {
          const toolNames = response.tool_calls.map((tc) => tc.name);
          console.log(
            `callModel: Generated ${response.tool_calls.length} tool call(s): ${toolNames.join(', ')}`
          );
        }

        // Check if the model is generating JSON tool calls as text content instead of using proper tool_calls
        if (
          response.content &&
          typeof response.content === 'string' &&
          !response.tool_calls?.length &&
          (response.content.includes('{"name"') ||
            response.content.includes('"type":"tool_call"'))
        ) {
          console.warn(
            'callModel: Model generated JSON tool call as text instead of using proper tool_calls mechanism'
          );

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
