import type { ModelProfile, ModelRole } from './types';

export const REVIEWED_ZDR_PROVIDERS = [
  'Anthropic',
  'OpenAI',
  'Google AI Studio',
] as const;

const assistantCapabilities = {
  tools: true,
  structuredOutput: true,
  reasoning: true,
  contextSize: 200_000,
};

const specialistCapabilities = {
  tools: true,
  structuredOutput: true,
  reasoning: true,
  contextSize: 128_000,
};

const cheapCapabilities = {
  tools: false,
  structuredOutput: true,
  reasoning: false,
  contextSize: 128_000,
};

export const MODEL_PROFILE: ModelProfile = {
  id: 'irmin-balanced',
  version: '2026-08-15.1',
  providerAllowlist: REVIEWED_ZDR_PROVIDERS,
  privacy: { zdrRequired: true, dataCollection: 'deny' },
  roles: {
    assistant: {
      primaryModel: 'anthropic/claude-sonnet-4.6',
      fallbackModels: ['openai/gpt-5.6-terra', 'google/gemini-3.7-flash'],
      directAnthropicModel: 'claude-sonnet-4-6',
      capabilities: assistantCapabilities,
      maxInputTokens: 64_000,
      maxOutputTokens: 16_000,
      timeoutMs: 300_000,
    },
    query: {
      primaryModel: 'anthropic/claude-sonnet-4.6',
      fallbackModels: ['openai/gpt-5.6-sol', 'openai/gpt-5.6-terra'],
      directAnthropicModel: 'claude-sonnet-4-6',
      capabilities: specialistCapabilities,
      maxInputTokens: 96_000,
      maxOutputTokens: 16_000,
      timeoutMs: 300_000,
    },
    scripting: {
      primaryModel: 'anthropic/claude-sonnet-4.6',
      fallbackModels: ['openai/gpt-5.6-sol', 'openai/gpt-5.6-terra'],
      directAnthropicModel: 'claude-sonnet-4-6',
      capabilities: specialistCapabilities,
      maxInputTokens: 96_000,
      maxOutputTokens: 16_000,
      timeoutMs: 300_000,
    },
    tool_selector: {
      primaryModel: 'anthropic/claude-haiku-4.5',
      fallbackModels: ['openai/gpt-5.6-luna', 'google/gemini-3.7-flash'],
      directAnthropicModel: 'claude-haiku-4-5-20251001',
      capabilities: { ...cheapCapabilities, tools: true },
      maxInputTokens: 32_000,
      maxOutputTokens: 2_000,
      timeoutMs: 60_000,
    },
    summarizer: {
      primaryModel: 'anthropic/claude-haiku-4.5',
      fallbackModels: ['openai/gpt-5.6-luna', 'google/gemini-3.7-flash'],
      directAnthropicModel: 'claude-haiku-4-5-20251001',
      capabilities: cheapCapabilities,
      maxInputTokens: 48_000,
      maxOutputTokens: 4_000,
      timeoutMs: 60_000,
    },
    title: {
      primaryModel: 'anthropic/claude-haiku-4.5',
      fallbackModels: ['openai/gpt-5.6-luna', 'google/gemini-3.7-flash'],
      directAnthropicModel: 'claude-haiku-4-5-20251001',
      capabilities: cheapCapabilities,
      maxInputTokens: 8_000,
      maxOutputTokens: 128,
      timeoutMs: 30_000,
    },
    hyde: {
      primaryModel: 'anthropic/claude-haiku-4.5',
      fallbackModels: ['openai/gpt-5.6-luna', 'google/gemini-3.7-flash'],
      directAnthropicModel: 'claude-haiku-4-5-20251001',
      capabilities: cheapCapabilities,
      maxInputTokens: 16_000,
      maxOutputTokens: 2_000,
      timeoutMs: 60_000,
    },
  },
};

export const EVALUATION_CANDIDATES: Readonly<
  Record<ModelRole, readonly string[]>
> = {
  assistant: [
    'openai/gpt-5.6-terra',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
    'google/gemini-3.7-flash',
  ],
  query: [
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
  ],
  scripting: [
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
  ],
  tool_selector: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
  summarizer: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
  title: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
  hyde: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
};
