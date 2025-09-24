import type { NewAIModel } from '@/database';

// TODO: Define maxContextTokens and maxOutputTokens for each model. This can then be used to validate model requests. Make sure this is used in LLM service and returned by the routes.

export const availableAIModels: NewAIModel[] = [
  // Anthropic Models
  {
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    description:
      'Anthropic Claude Sonnet 4: Optimal balance of intelligence, cost, and speed',
    inputPricePerMillionTokens: 3,
    outputPricePerMillionTokens: 15,
    isActive: true,
  },
  {
    name: 'Claude 3.5 Haiku latest',
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-latest',
    description:
      'Anthropic Claude 3.5 Haiku: fastest, most cost-effective model',
    inputPricePerMillionTokens: 0.8,
    outputPricePerMillionTokens: 4,
    isActive: true,
  },
  // OpenAI Models
  {
    name: 'GPT-5',
    provider: 'openai',
    modelId: 'gpt-5',
    description:
      'The best model for coding and agentic tasks across industries',
    inputPricePerMillionTokens: 1.2,
    outputPricePerMillionTokens: 10,
    isActive: true,
  },
  {
    name: 'GPT-5 Mini',
    provider: 'openai',
    modelId: 'gpt-5-mini',
    description: 'A faster, cheaper version of GPT-5 for well-defined tasks',
    inputPricePerMillionTokens: 0.25,
    outputPricePerMillionTokens: 2,
    isActive: true,
  },
  {
    name: 'GPT-5 Nano',
    provider: 'openai',
    modelId: 'gpt-5-nano',
    description: 'A smaller, cheaper version of GPT-5 for well-defined tasks',
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
    outputPricePerMillionTokens: 0.75,
    isActive: true,
  },
  {
    name: 'GPT-OSS 20B',
    provider: 'groq',
    modelId: 'openai/gpt-oss-20b',
    description: 'OpenAI GPT-OSS 20B parameter model via Groq',
    inputPricePerMillionTokens: 0.1,
    outputPricePerMillionTokens: 0.5,
    isActive: true,
  },
  {
    name: 'DeepSeek R1 Distill Llama 70B',
    provider: 'groq',
    modelId: 'deepseek-r1-distill-llama-70b',
    description: 'DeepSeek / Meta R1 distilled Llama 70B model via Groq',
    inputPricePerMillionTokens: 0.75,
    outputPricePerMillionTokens: 0.99,
    isActive: true,
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
    name: 'Kimi K2 Instruct',
    provider: 'groq',
    modelId: 'moonshotai/kimi-k2-instruct',
    description: 'Moonshot AI Kimi K2 instruction model via Groq',
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
 * Seed default AI models in the database
 */
export async function seedDefaultModels() {
  const { db, aiModels } = await import('@/database');
  const { eq } = await import('drizzle-orm');

  for (const modelData of availableAIModels) {
    const existing = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.modelId, modelData.modelId));
    if (!existing.length) {
      await db.insert(aiModels).values(modelData);
    }
  }
}
