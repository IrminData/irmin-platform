import type { Message, NewMessage } from '@/database';
import { AIMessageChunk } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import type { IterableReadableStream } from '@langchain/core/utils/stream';

import { agentGraphService } from '@/services/agentGraph';
import { analyticsService } from '@/services/analytics';
import { type LLMProvider, llmService, type ModelInfo } from '@/services/llm';
import { mcpService } from '@/services/mcp';

import { DEFAULT_LLM_CONFIG } from '@/config/defaults';

import type { ToolSelection } from '@/types/agents';
import type { MessageBlock } from '@/types/blocks';

// eslint-disable-next-line import-x/no-cycle
import { processStreamingResponse } from '@/utils/streaming';

export interface CompletionOptions {
  messages: NewMessage[] | Message[];
  conversationId: string;
  userMessageId?: string; // Optional, used for analytics
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  toolSelection?: ToolSelection;
  authToken?: string; // Only needed when Irmin MCP is used
  useAgentGraph?: boolean; // Use LangGraph for iterative tool calling
  maxToolCalls?: number; // Maximum tool calls for agent graph
}

class CompletionService {
  /**
   * Create a streaming response with tools support
   */
  async createStreamingResponse(
    options: CompletionOptions
  ): Promise<ReadableStream<AIMessageChunk>> {
    const startTime = Date.now();

    const usedModel =
      options.model ||
      llmService.getDefaultModels()[
        options.provider || DEFAULT_LLM_CONFIG.provider
      ];

    // Use agent graph for iterative tool calling if requested and tools are available
    if (options.useAgentGraph) {
      const agentStream = await agentGraphService.executeAgentStream(options);
      return this.wrapStreamWithAnalytics(
        agentStream,
        options,
        usedModel,
        startTime,
        DEFAULT_LLM_CONFIG.provider
      );
    }

    try {
      // Get MCP tools if enabled
      const tools = options.toolSelection
        ? await this.createMcpTools(options.authToken, options.toolSelection)
        : [];

      // Create model with tools
      const llm = llmService.createModel({
        provider: options.provider || DEFAULT_LLM_CONFIG.provider,
        model: usedModel,
        temperature: options.temperature || DEFAULT_LLM_CONFIG.temperature,
        maxTokens: options.maxTokens || DEFAULT_LLM_CONFIG.maxTokens,
        tools,
      });

      // Convert messages to LangChain format
      const langchainMessages = llmService.convertMessagesToLangChain(
        options.messages,
        options.systemPrompt
      );

      // Create streaming response
      const stream = await llm.stream(langchainMessages);

      // Wrap the stream to capture analytics when it completes
      return this.wrapStreamWithAnalytics(
        stream,
        options,
        usedModel,
        startTime,
        DEFAULT_LLM_CONFIG.provider
      );
    } catch (error) {
      // Log error analytics
      analyticsService.logError(
        'completion_streaming',
        error instanceof Error ? error.message : 'Unknown error',
        options.conversationId,
        options.userMessageId
      );

      console.error('Completion service error:', error);
      throw new Error(
        `Failed to create streaming completion response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a non-streaming response with block information
   */
  async createResponse(options: CompletionOptions): Promise<{
    content: string;
    blocks: MessageBlock[];
  }> {
    try {
      // Use streaming response internally to handle all cases including agent graph
      const stream = await this.createStreamingResponse(options);

      // Use the centralized stream processing logic
      const result = await processStreamingResponse(stream, {
        conversationId: options.conversationId,
        startTime: Date.now(),
        modelProvider: options.provider || DEFAULT_LLM_CONFIG.provider,
        model:
          options.model ||
          llmService.getDefaultModels()[
            options.provider || DEFAULT_LLM_CONFIG.provider
          ],
        history: options.messages,
        returnStream: false,
      });

      // Convert the result to the expected format
      const blocks: MessageBlock[] = (result.messages || []).map((msg) => ({
        id: msg.blockId || `block-${Date.now()}-${Math.random()}`,
        type: msg.messageType as
          | 'text'
          | 'tool_call'
          | 'tool_result'
          | 'reasoning'
          | 'source'
          | 'file'
          | 'error'
          | 'system',
        content: msg.content,
        order: msg.blockOrder,
        metadata: msg.metadata,
        parentBlockId: msg.parentBlockId || undefined,
        toolCallId: msg.metadata?.toolCallId as string,
        toolName: msg.metadata?.toolName as string,
        sourceId: msg.metadata?.sourceId as string,
        url: msg.metadata?.url as string,
      }));

      // Extract full content from blocks
      const fullContent = blocks.map((block) => block.content).join('\n');

      return {
        content: fullContent,
        blocks,
      };
    } catch (error) {
      // Log error analytics
      analyticsService.logError(
        'completion_non_streaming',
        error instanceof Error ? error.message : 'Unknown error',
        options.conversationId,
        options.userMessageId
      );

      console.error('Non-streaming completion service error:', error);
      throw new Error(
        `Failed to create completion response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Wrap a stream with analytics logging when it completes
   */
  private wrapStreamWithAnalytics(
    stream: IterableReadableStream<AIMessageChunk>,
    options: CompletionOptions,
    usedModel: string,
    startTime: number,
    defaultProvider: string
  ): ReadableStream<AIMessageChunk> {
    let fullContent = '';
    let hasLoggedAnalytics = false;

    // Convert the async generator to a proper ReadableStream
    return new ReadableStream<AIMessageChunk>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Collect content for analytics
            if (chunk.content) {
              fullContent += chunk.content;
            }
            controller.enqueue(chunk);
          }

          // Log analytics when stream completes (only once)
          if (!hasLoggedAnalytics) {
            hasLoggedAnalytics = true;
            try {
              const processingTimeMs = Date.now() - startTime;
              const calculatedUsage = llmService.calculateUsage(
                options.messages,
                fullContent,
                (options.provider || defaultProvider) as LLMProvider,
                usedModel
              );

              analyticsService.logModelUsage(
                usedModel,
                calculatedUsage.totalTokens,
                calculatedUsage.totalCost,
                processingTimeMs,
                options.conversationId,
                options.userMessageId,
                {
                  provider: options.provider || defaultProvider,
                  model: usedModel,
                  temperature: options.temperature,
                  toolSelection: options.toolSelection,
                  useAgentGraph: options.useAgentGraph,
                  maxToolCalls: options.maxToolCalls,
                }
              );
            } catch (analyticsError) {
              console.error('Analytics logging error:', analyticsError);
              // Don't throw - analytics errors shouldn't break the stream
            }
          }

          // Send completion event before closing
          const completionEventChunk = new AIMessageChunk({
            content: '',
            additional_kwargs: {
              stream_complete: true,
            },
          });
          controller.enqueue(completionEventChunk);

          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);

          // Send error event before closing
          const errorEventChunk = new AIMessageChunk({
            content: '',
            additional_kwargs: {
              stream_error: true,
              error_message:
                error instanceof Error ? error.message : 'Unknown error',
            },
          });
          controller.enqueue(errorEventChunk);

          controller.error(error);
        }
      },
    });
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    const availableModels = llmService.getAvailableModels();

    const models: ModelInfo[] = [];

    for (const provider of Object.keys(availableModels)) {
      for (const modelId of availableModels[provider as LLMProvider]) {
        const modelInfo = llmService.getModelInfo(
          provider as LLMProvider,
          modelId
        );
        models.push(modelInfo);
      }
    }

    return models;
  }

  /**
   * Create MCP tools for a specific request
   */
  async createMcpTools(
    authToken?: string,
    toolSelection?: ToolSelection
  ): Promise<StructuredTool[]> {
    return await mcpService.createMcpTools(authToken, toolSelection);
  }
}

// Export singleton instance
export const completionService = new CompletionService();
