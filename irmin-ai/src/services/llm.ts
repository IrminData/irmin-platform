import type { Message, NewMessage } from '@/database';
import { type AnthropicInput, ChatAnthropic } from '@langchain/anthropic';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { wrapSDK } from 'langsmith/wrappers';

import { DEFAULT_MODELS } from '@/config/defaults';
import { env } from '@/config/env';
import { availableAIModels } from '@/config/models';

export type LLMProvider = 'groq' | 'openai' | 'anthropic';

interface LLMOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: StructuredTool[];
  streaming?: boolean;
  // Provider-specific options
  anthropic?: {
    thinking?: AnthropicInput['thinking'];
  };
  openai?: {
    reasoning?: {
      effort?: 'minimal' | 'low' | 'medium' | 'high';
    };
  };
}

export interface ModelInfo {
  name: string;
  modelId: string;
  description: string;
  inputPricePerMillionTokens: number;
  outputPricePerMillionTokens: number;
}

class LlmService {
  private defaultGroqModel = DEFAULT_MODELS.groq;
  private defaultOpenAIModel = DEFAULT_MODELS.openai;
  private defaultAnthropicModel = DEFAULT_MODELS.anthropic;

  /**
   * Create a new model instance with custom parameters and tools
   */
  createModel(options: LLMOptions) {
    const {
      provider,
      model,
      temperature = 0.7,
      maxTokens = 1000,
      tools = [],
      streaming = true, // Default to streaming for better UX
    } = options;

    let llm: ChatGroq | ChatOpenAI | ChatAnthropic;

    if (provider === 'groq') {
      llm = wrapSDK(
        new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          model: model || this.defaultGroqModel,
          temperature,
          maxTokens,
          streaming,
        })
      );
    } else if (provider === 'openai') {
      const openAIConfig: {
        apiKey: string;
        model: string;
        temperature?: number;
        maxTokens: number;
        streaming: boolean;
        extraBody?: Record<string, unknown>;
      } = {
        apiKey: env.OPENAI_API_KEY,
        model: model || this.defaultOpenAIModel,
        temperature,
        maxTokens,
        streaming,
      };

      // Add reasoning effort configuration if provided
      // Pass via extraBody as LangChain may not have direct support yet
      if (options.openai?.reasoning?.effort) {
        openAIConfig.extraBody = {
          reasoning: {
            effort: options.openai.reasoning.effort,
          },
        };
      }

      llm = wrapSDK(new ChatOpenAI(openAIConfig));
    } else if (provider === 'anthropic') {
      // When thinking is enabled, temperature must be 1.0 or undefined per Anthropic API
      const anthropicTemperature = options.anthropic?.thinking
        ? 1.0
        : temperature;

      llm = wrapSDK(
        new ChatAnthropic({
          apiKey: env.ANTHROPIC_API_KEY,
          model: model || this.defaultAnthropicModel,
          temperature: anthropicTemperature,
          maxTokens,
          streaming,
          thinking: options.anthropic?.thinking,
        })
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Bind tools if provided
    if (tools.length > 0) {
      return llm.bindTools(tools);
    }

    return llm;
  }

  /**
   * Convert our Message format to LangChain messages with sanitization
   */
  convertMessagesToLangChain(
    messages: NewMessage[] | Message[],
    systemPrompt?: string
  ) {
    const langchainMessages: (HumanMessage | SystemMessage | AIMessage)[] = [];

    // Find existing system message in conversation history
    const existingSystemMessage = messages.find((msg) => msg.role === 'system');

    // Add system message first (either existing from conversation or new one)
    // IMPORTANT: Claude only allows ONE system message per conversation and it MUST be the first message.
    // We prioritize new system prompts to allow for dynamic agent updates.
    if (systemPrompt) {
      // Use new system prompt (allows for updated agent instructions)
      langchainMessages.push(new SystemMessage(systemPrompt));
    } else if (existingSystemMessage) {
      // Fall back to existing system message if no new prompt provided
      langchainMessages.push(new SystemMessage(existingSystemMessage.content));
    }

    // Convert messages with sanitization (excluding system messages since we already added one)
    for (const message of messages) {
      // Skip system messages since we already added the system message at the beginning
      if (message.role === 'system') {
        continue;
      }

      switch (message.role) {
        case 'user': {
          // User messages are already sanitized in the request handler
          // No need to sanitize again
          langchainMessages.push(new HumanMessage(message.content));
          break;
        }
        case 'assistant': {
          // Assistant messages are AI-generated content and should never be sanitized
          langchainMessages.push(new AIMessage(message.content));
          break;
        }
      }
    }

    return langchainMessages;
  }

  /**
   * Get available models for each provider
   */
  getAvailableModels(): Record<LLMProvider, string[]> {
    return {
      groq: availableAIModels
        .filter((m) => m.provider === 'groq')
        .map((m) => m.modelId),
      openai: availableAIModels
        .filter((m) => m.provider === 'openai')
        .map((m) => m.modelId),
      anthropic: availableAIModels
        .filter((m) => m.provider === 'anthropic')
        .map((m) => m.modelId),
    };
  }

  /**
   * Get model info for a specific model
   */
  getModelInfo(provider: LLMProvider, modelId: string): ModelInfo {
    const modelInfo = availableAIModels.find(
      (m) => m.modelId === modelId && m.provider === provider
    );

    if (!modelInfo) {
      throw new Error(`Model ${modelId} for provider ${provider} not found`);
    }

    return {
      name: modelInfo.name,
      modelId: modelInfo.modelId,
      description: modelInfo.description,
      inputPricePerMillionTokens: modelInfo.inputPricePerMillionTokens || 0,
      outputPricePerMillionTokens: modelInfo.outputPricePerMillionTokens || 0,
    };
  }

  /**
   * Get default models for each provider
   */
  getDefaultModels() {
    return {
      groq: this.defaultGroqModel,
      openai: this.defaultOpenAIModel,
      anthropic: this.defaultAnthropicModel,
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate usage statistics and costs
   */
  calculateUsage(
    messages: NewMessage[],
    response: string,
    provider: LLMProvider,
    modelId: string,
    exactInputTokens?: number,
    exactOutputTokens?: number
  ) {
    // Get model pricing information
    const modelInfo = this.getModelInfo(provider, modelId);

    // Use exact token counts if provided, otherwise estimate
    const inputTokens =
      exactInputTokens ??
      this.estimateTokens(messages.map((m) => m.content).join(' '));
    const outputTokens = exactOutputTokens ?? this.estimateTokens(response);
    const isEstimated =
      exactInputTokens === undefined || exactOutputTokens === undefined;

    // Calculate costs in USD (prices are per million tokens)
    const inputCost =
      (inputTokens / 1_000_000) * modelInfo.inputPricePerMillionTokens;
    const outputCost =
      (outputTokens / 1_000_000) * modelInfo.outputPricePerMillionTokens;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost: Number(inputCost.toFixed(6)), // Round to 6 decimal places for precision
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      isEstimated,
    };
  }
}

// Export singleton instance
export const llmService = new LlmService();
