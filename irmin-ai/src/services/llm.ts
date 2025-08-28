import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { env } from '@/config/env';
import type { Message } from '@/types';

export type LLMProvider = 'groq' | 'openai';

export interface LLMOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: StructuredTool[];
}

export interface ModelInfo {
  name: string;
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
}

export class LlmService {
  private defaultGroqModel = 'llama-3.3-70b-versatile';
  private defaultOpenAIModel = 'gpt-4o-mini';

  /**
   * Create a new model instance with custom parameters and tools
   */
  createModel(
    options: LLMOptions
  ):
    | ChatGroq
    | ChatOpenAI
    | ReturnType<ChatGroq['bindTools']>
    | ReturnType<ChatOpenAI['bindTools']> {
    const {
      provider,
      model,
      temperature = 0.7,
      maxTokens = 1000,
      tools = [],
    } = options;

    let llm: ChatGroq | ChatOpenAI;

    if (provider === 'groq') {
      llm = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        model: model || this.defaultGroqModel,
        temperature,
        maxTokens,
      });
    } else {
      llm = new ChatOpenAI({
        apiKey: env.OPENAI_API_KEY,
        model: model || this.defaultOpenAIModel,
        temperature,
        maxTokens,
      });
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
  convertMessagesToLangChain(
    messages: Message[],
    systemPrompt?: string
  ): (HumanMessage | SystemMessage | AIMessage)[] {
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
      groq: [
        'llama-3.3-70b-versatile',
        'llama-3.3-8b-versatile',
        'llama-3.1-8b-versatile',
        'llama-3.1-70b-versatile',
        'mixtral-8x7b-32768',
        'gemma-7b-it',
      ],
      openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4-turbo-preview',
      ],
    };
  }

  /**
   * Get model info for a specific model
   */
  getModelInfo(provider: LLMProvider, model: string): ModelInfo {
    const modelInfo: Record<string, ModelInfo> = {
      // Groq models
      'llama-3.3-70b-versatile': {
        name: 'Llama 3.3 70B Versatile',
        description: 'Meta Llama 3.3 70B parameter model via Groq',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsTools: true,
      },
      'llama-3.3-8b-versatile': {
        name: 'Llama 3.3 8B Versatile',
        description: 'Meta Llama 3.3 8B parameter model via Groq',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsTools: true,
      },
      'mixtral-8x7b-32768': {
        name: 'Mixtral 8x7B 32K',
        description: 'Mistral Mixtral 8x7B model with 32K context via Groq',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsTools: true,
      },
      'gemma-7b-it': {
        name: 'Gemma 7B IT',
        description: 'Google Gemma 7B instruction-tuned model via Groq',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsTools: true,
      },
      // OpenAI models
      'gpt-4o': {
        name: 'GPT-4o',
        description: 'OpenAI GPT-4 Omni model',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        description: 'OpenAI GPT-4 Omni Mini model',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        description: 'OpenAI GPT-4 Turbo model',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        description: 'OpenAI GPT-3.5 Turbo model',
        maxTokens: 16385,
        supportsStreaming: true,
        supportsTools: true,
      },
    };

    return (
      modelInfo[model] || {
        name: model,
        description: `${provider === 'groq' ? 'Groq' : 'OpenAI'} model: ${model}`,
        maxTokens: 8192,
        supportsStreaming: true,
        supportsTools: true,
      }
    );
  }

  /**
   * Get default models for each provider
   */
  getDefaultModels(): Record<LLMProvider, string> {
    return {
      groq: this.defaultGroqModel,
      openai: this.defaultOpenAIModel,
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate usage statistics
   */
  calculateUsage(
    messages: Message[],
    response: string
  ): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    const promptText = messages.map((m) => m.content).join(' ');
    const promptTokens = this.estimateTokens(promptText);
    const completionTokens = this.estimateTokens(response);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }
}

// Export singleton instance
export const llmService = new LlmService();
