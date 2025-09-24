export const DEFAULT_LLM_CONFIG = {
  provider: 'groq' as const,
  temperature: 0.7,
  maxTokens: 1000,
  maxToolCalls: 10,
} as const;

export const DEFAULT_MODELS = {
  groq: 'moonshotai/kimi-k2-instruct',
  openai: 'gpt-5',
  anthropic: 'claude-sonnet-4-20250514',
} as const;
