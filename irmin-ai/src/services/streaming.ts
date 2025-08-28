import { llmService, type LLMProvider } from '@/services/llm';
import { mcpService } from '@/services/mcp';
import type { Message } from '@/types';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';

export interface StreamingChatOptions {
  messages: Message[];
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  useTools?: boolean;
  authToken?: string;
}

export interface StreamingResponse {
  stream: ReadableStream;
  headers: Headers;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class StreamingService {
  /**
   * Create a streaming chat response
   */
  async createStreamingResponse(
    options: StreamingChatOptions
  ): Promise<IterableReadableStream<AIMessageChunk>> {
    const {
      messages,
      provider = 'groq',
      model,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      useTools = false,
      authToken,
    } = options;

    try {
      // Initialize MCP tools if needed and not already initialized
      if (useTools) {
        await this.ensureMcpInitialized(authToken);
      }

      // Get MCP tools if enabled
      const tools = useTools ? mcpService.getTools() : [];

      // Create model with tools
      const llm = llmService.createModel({
        provider,
        model,
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

      return stream;
    } catch (error) {
      console.error('Streaming service error:', error);
      throw new Error(
        `Failed to create streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a non-streaming response (fallback)
   */
  async createResponse(options: StreamingChatOptions): Promise<{
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
      useTools = false,
      authToken,
    } = options;

    try {
      // Initialize MCP tools if needed
      if (useTools) {
        await this.ensureMcpInitialized(authToken);
      }

      // Get MCP tools if enabled
      const tools = useTools ? mcpService.getTools() : [];

      // Create model with tools
      const llm = llmService.createModel({
        provider,
        model,
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
      const usage = llmService.calculateUsage(messages, content);

      return {
        content,
        usage,
      };
    } catch (error) {
      console.error('Non-streaming service error:', error);
      throw new Error(
        `Failed to create response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): Array<{
    id: string;
    provider: LLMProvider;
    name: string;
    description: string;
    maxTokens: number;
    supportsStreaming: boolean;
    supportsTools: boolean;
  }> {
    const availableModels = llmService.getAvailableModels();
    const models: Array<{
      id: string;
      provider: LLMProvider;
      name: string;
      description: string;
      maxTokens: number;
      supportsStreaming: boolean;
      supportsTools: boolean;
    }> = [];

    // Process Groq models
    for (const modelId of availableModels.groq) {
      const modelInfo = llmService.getModelInfo('groq', modelId);
      models.push({
        id: modelId,
        provider: 'groq',
        ...modelInfo,
      });
    }

    // Process OpenAI models
    for (const modelId of availableModels.openai) {
      const modelInfo = llmService.getModelInfo('openai', modelId);
      models.push({
        id: modelId,
        provider: 'openai',
        ...modelInfo,
      });
    }

    return models;
  }

  /**
   * Get MCP tools status
   */
  getMcpStatus(): {
    enabled: boolean;
    initialized: boolean;
    toolCount: number;
    toolNames: string[];
  } {
    return {
      enabled: true,
      initialized: mcpService.isInitialized(),
      toolCount: mcpService.getToolCount(),
      toolNames: mcpService.getToolNames(),
    };
  }

  /**
   * Reinitialize MCP tools with new auth token
   */
  async reinitializeMcp(authToken?: string): Promise<void> {
    await mcpService.reinitialize(authToken);
  }

  /**
   * Ensure MCP tools are initialized with the current auth token
   * Only reinitializes if the auth token has changed or tools aren't initialized
   */
  async ensureMcpInitialized(authToken?: string): Promise<void> {
    // Check if we need to reinitialize (auth token changed or not initialized)
    if (
      !mcpService.isInitialized() ||
      mcpService.hasAuthTokenChanged(authToken)
    ) {
      await mcpService.reinitialize(authToken);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await mcpService.cleanup();
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
