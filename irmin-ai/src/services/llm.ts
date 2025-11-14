import { type AnthropicInput, ChatAnthropic } from '@langchain/anthropic';
import { ChatGroq, ChatGroqInput } from '@langchain/groq';
import { ChatOpenAI, OpenAIInput } from '@langchain/openai';
import { wrapSDK } from 'langsmith/wrappers';

import { env } from '@/config/env';
import { availableAIModels, DEFAULT_MODELS } from '@/config/models';

type LLMProvider = 'groq' | 'openai' | 'anthropic';

export interface LLMOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  streaming?: boolean;
  // Provider-specific options
  groq?: ChatGroqInput;
  anthropic?: AnthropicInput;
  openai?: OpenAIInput;
}

class LLMService {
  private defaultGroqModel = DEFAULT_MODELS.groq;
  private defaultOpenAIModel = DEFAULT_MODELS.openai;
  private defaultAnthropicModel = DEFAULT_MODELS.anthropic;

  /**
   * Create a new model instance with custom parameters and tools
   */
  createLLM(options: LLMOptions) {
    const {
      provider,
      model,
      temperature = 0.7,
      maxTokens = 10000,
      timeout = 10000,
      streaming = false,
    } = options;

    let llm: ChatGroq | ChatOpenAI | ChatAnthropic;

    if (provider === 'groq') {
      llm = wrapSDK(
        new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          model: model || this.defaultGroqModel,
          temperature,
          maxTokens,
          timeout,
          streaming,
          ...options.groq,
        })
      );
    } else if (provider === 'openai') {
      llm = wrapSDK(
        new ChatOpenAI({
          apiKey: env.OPENAI_API_KEY,
          model: model || this.defaultOpenAIModel,
          temperature,
          maxTokens,
          timeout,
          streaming,
          ...options.openai,
        })
      );
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
          ...options.anthropic,
          // There is no timeout option for Anthropic
        })
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return llm;
  }

  /**
   * Get model info for a specific model
   */
  getModelInfo(provider: LLMProvider, modelId: string) {
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
}

// Export singleton instance
export const llmService = new LLMService();
