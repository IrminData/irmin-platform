import type { NewAIModel } from '@/database';

// TODO: Define maxContextTokens and maxOutputTokens for each model. This can then be used to validate model requests. Make sure this is used in LLM service and returned by the routes.

export const DEFAULT_MODELS = {
  groq: 'moonshotai/kimi-k2-instruct-0905',
  openai: 'gpt-5.1',
  anthropic: 'claude-sonnet-4-5-20250929',
} as const;

export const availableAIModels: NewAIModel[] = [
  // Anthropic Models
  {
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    modelId: 'claude-opus-4-1-20250805',
    description: "Anthropic's powerful model for complex and creative tasks",
    inputPricePerMillionTokens: 15,
    outputPricePerMillionTokens: 75,
    isActive: true,
  },
  {
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-5-20250929',
    description:
      "Anthropic's most intelligent model for building agents and coding",
    inputPricePerMillionTokens: 3,
    outputPricePerMillionTokens: 15,
    isActive: true,
  },
  {
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    modelId: 'claude-haiku-4-5-20251001',
    description:
      "Anthropic's fastest, most cost-effective model, with near-frontier intelligence",
    inputPricePerMillionTokens: 1,
    outputPricePerMillionTokens: 5,
    isActive: true,
  },
  // OpenAI Models
  {
    name: 'GPT-5.1',
    provider: 'openai',
    modelId: 'gpt-5.1',
    description:
      'Flagship model optimized for coding and agentic tasks with configurable reasoning effort',
    inputPricePerMillionTokens: 1.25,
    outputPricePerMillionTokens: 10,
    isActive: true,
  },
  {
    name: 'GPT-5 Mini',
    provider: 'openai',
    modelId: 'gpt-5-mini',
    description:
      'A faster, cost-efficient version of GPT-5 suitable for well-defined tasks and precise prompts',
    inputPricePerMillionTokens: 0.25,
    outputPricePerMillionTokens: 2.0,
    isActive: true,
  },
  {
    name: 'GPT-5 Nano',
    provider: 'openai',
    modelId: 'gpt-5-nano',
    description:
      'The fastest and most cost-efficient version of GPT-5, ideal for summarization and classification tasks',
    inputPricePerMillionTokens: 0.05,
    outputPricePerMillionTokens: 0.4,
    isActive: true,
  },
  // Groq Models
  {
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    description: 'Meta Llama 3.1 8B parameter model via Groq',
    inputPricePerMillionTokens: 0.05,
    outputPricePerMillionTokens: 0.08,
    isActive: true,
  },
  {
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    description: 'Meta Llama 3.3 70B parameter model via Groq',
    inputPricePerMillionTokens: 0.59,
    outputPricePerMillionTokens: 0.79,
    isActive: true,
  },
  {
    name: 'Llama Guard 4 12B',
    provider: 'groq',
    modelId: 'meta-llama/llama-guard-4-12b',
    description: 'Meta Llama Guard 4 12B safety model via Groq',
    inputPricePerMillionTokens: 0.2,
    outputPricePerMillionTokens: 0.2,
    isActive: true,
  },
  {
    name: 'GPT-OSS 120B',
    provider: 'groq',
    modelId: 'openai/gpt-oss-120b',
    description: 'OpenAI GPT-OSS 120B parameter model via Groq',
    inputPricePerMillionTokens: 0.15,
    outputPricePerMillionTokens: 0.6,
    isActive: true,
  },
  {
    name: 'GPT-OSS 20B',
    provider: 'groq',
    modelId: 'openai/gpt-oss-20b',
    description: 'OpenAI GPT-OSS 20B parameter model via Groq',
    inputPricePerMillionTokens: 0.075,
    outputPricePerMillionTokens: 0.3,
    isActive: true,
  },
  {
    name: 'DeepSeek R1 Distill Llama 70B',
    provider: 'groq',
    modelId: 'deepseek-r1-distill-llama-70b',
    description:
      'DeepSeek / Meta R1 distilled Llama 70B model via Groq (Deprecated: Use llama-3.3-70b-versatile or openai/gpt-oss-120b)',
    inputPricePerMillionTokens: 0.75,
    outputPricePerMillionTokens: 0.99,
    isActive: false,
  },
  {
    name: 'Llama 4 Maverick 17B 128E Instruct',
    provider: 'groq',
    modelId: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    description: 'Meta Llama 4 Maverick 17B 128E instruction model via Groq',
    inputPricePerMillionTokens: 0.2,
    outputPricePerMillionTokens: 0.6,
    isActive: true,
  },
  {
    name: 'Llama 4 Scout 17B 16E Instruct',
    provider: 'groq',
    modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
    description: 'Meta Llama 4 Scout 17B 16E instruction model via Groq',
    inputPricePerMillionTokens: 0.11,
    outputPricePerMillionTokens: 0.34,
    isActive: true,
  },
  {
    name: 'Kimi K2 Instruct 0905',
    provider: 'groq',
    modelId: 'moonshotai/kimi-k2-instruct-0905',
    description:
      'Moonshot AI Kimi K2 0905 instruction model via Groq (256K context window, improved agentic coding)',
    inputPricePerMillionTokens: 1,
    outputPricePerMillionTokens: 3,
    isActive: true,
  },
  {
    name: 'Qwen3 32B',
    provider: 'groq',
    modelId: 'qwen/qwen3-32b',
    description: 'Alibaba Cloud Qwen3 32B model via Groq',
    inputPricePerMillionTokens: 0.29,
    outputPricePerMillionTokens: 0.59,
    isActive: true,
  },
];

/**
 * Seed default AI models in the database.
 * Uses batch upsert to avoid N+1 queries - inserts all models in a single query,
 * skipping any that already exist based on the unique modelId constraint.
 */
export async function seedDefaultModels() {
  const { db, aiModels } = await import('@/database');

  // Batch insert with ON CONFLICT DO NOTHING - single query instead of N queries
  await db.insert(aiModels).values(availableAIModels).onConflictDoNothing({
    target: aiModels.modelId,
  });
}
