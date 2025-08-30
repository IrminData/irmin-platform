import type { Message } from '@/database';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import type { IterableReadableStream } from '@langchain/core/utils/stream';

import { analyticsService } from '@/services/analytics';
import { type LLMProvider, llmService, type ModelInfo } from '@/services/llm';
import { mcpService } from '@/services/mcp';

import { type ToolSelection } from '@/types/chat';

interface CompletionOptions {
  messages: Message[];
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  toolSelection?: ToolSelection;
  authToken?: string;
}

class CompletionService {
  /**
   * Create a streaming response for agents (returns AIMessageChunk)
   */
  async createStreamingResponse(
    options: CompletionOptions
  ): Promise<IterableReadableStream<AIMessageChunk>> {
    const {
      messages,
      provider = 'groq',
      model,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      toolSelection,
      authToken,
    } = options;

    const startTime = Date.now();

    // Get the model used for the completion
    const usedModel = model || llmService.getDefaultModels()[provider];

    try {
      // Get MCP tools if enabled (per-request)
      const tools = toolSelection
        ? await this.createMcpTools(authToken, toolSelection)
        : [];

      // Create model with tools
      const llm = llmService.createModel({
        provider,
        model: usedModel,
        temperature,
        maxTokens,
        tools,
      });

      // Convert messages to LangChain format
      const langchainMessages = llmService.convertMessagesToLangChain(
        messages,
        systemPrompt
      );

      // Create streaming response
      const stream = await llm.stream(langchainMessages);

      const processingTimeMs = Date.now() - startTime;

      // TODO: We need to track the model usage here as well, just not sure how, since it's a stream.

      // Log custom event for streaming performance
      await analyticsService.logCustomEvent({
        eventType: 'model_used',
        tokenCount: 0, // Will be calculated later
        costUSD: 0, // Will be calculated later
        processingTimeMs,
        eventData: {
          provider,
          model: usedModel,
          streaming: true,
          messageCount: messages.length,
        },
      });

      return stream;
    } catch (error) {
      // Log error analytics
      await analyticsService.logError(
        'completion_streaming',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );

      console.error('Completion service error:', error);
      throw new Error(
        `Failed to create streaming completion response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a non-streaming response (fallback)
   */
  async createResponse(options: CompletionOptions): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    const {
      messages,
      provider = 'groq',
      model,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      toolSelection,
      authToken,
    } = options;

    const startTime = Date.now();

    // Get the model used for the completion
    const usedModel = model || llmService.getDefaultModels()[provider];

    try {
      // Get MCP tools if enabled (per-request)
      const tools = toolSelection
        ? await this.createMcpTools(authToken, toolSelection)
        : [];

      // Create model with tools
      const llm = llmService.createModel({
        provider,
        model: usedModel,
        temperature,
        maxTokens,
        tools,
      });

      // Convert messages to LangChain format
      const langchainMessages = llmService.convertMessagesToLangChain(
        messages,
        systemPrompt
      );

      // Get response
      const result = await llm.invoke(langchainMessages);
      const content = result.content as string;

      // Calculate usage
      const calculatedUsage = llmService.calculateUsage(
        messages,
        content,
        provider,
        usedModel
      );
      const processingTimeMs = Date.now() - startTime;

      // Log model usage analytics
      await analyticsService.logModelUsage(
        usedModel,
        calculatedUsage.totalTokens,
        calculatedUsage.totalCost,
        processingTimeMs
      );

      return {
        content,
        usage: {
          promptTokens: calculatedUsage.inputTokens,
          completionTokens: calculatedUsage.outputTokens,
          totalTokens: calculatedUsage.totalTokens,
        },
      };
    } catch (error) {
      // Log error analytics
      await analyticsService.logError(
        'completion_non_streaming',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );

      console.error('Non-streaming completion service error:', error);
      throw new Error(
        `Failed to create completion response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
   * This is per-request and doesn't maintain global state
   */
  async createMcpTools(
    authToken?: string,
    toolSelection?: ToolSelection
  ): Promise<StructuredTool[]> {
    return await mcpService.createMcpTools(authToken, toolSelection);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for per-request MCP tools
  }
}

// Export singleton instance
export const completionService = new CompletionService();
