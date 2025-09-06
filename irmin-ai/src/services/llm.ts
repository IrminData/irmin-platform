import type { Message } from '@/database';
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

export type LLMProvider = 'groq' | 'openai';

interface LLMOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: StructuredTool[];
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
    } = options;

    let llm: ChatGroq | ChatOpenAI;

    if (provider === 'groq') {
      llm = wrapSDK(
        new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          model: model || this.defaultGroqModel,
          temperature,
          maxTokens,
          streaming: true, // Explicit streaming optimization
        })
      );
    } else {
      llm = wrapSDK(
        new ChatOpenAI({
          apiKey: env.OPENAI_API_KEY,
          model: model || this.defaultOpenAIModel,
          temperature,
          maxTokens,
          streaming: true, // Explicit streaming optimization
        })
      );
    }

    // Bind tools if provided
    if (tools.length > 0) {
      return llm.bindTools(tools);
    }

    return llm;
  }

  /**
   * Convert our Message format to LangChain messages
   */
  convertMessagesToLangChain(messages: Message[], systemPrompt?: string) {
    const langchainMessages: (HumanMessage | SystemMessage | AIMessage)[] = [];

    // Add system message if provided
    if (systemPrompt) {
      langchainMessages.push(new SystemMessage(systemPrompt));
    }

    // Convert messages
    for (const message of messages) {
      switch (message.role) {
        case 'user':
          langchainMessages.push(new HumanMessage(message.content));
          break;
        case 'assistant':
          langchainMessages.push(new AIMessage(message.content));
          break;
        case 'system':
          langchainMessages.push(new SystemMessage(message.content));
          break;
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
    messages: Message[],
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
