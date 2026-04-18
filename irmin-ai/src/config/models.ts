import type { NewAIModel } from '@/database';

// TODO: Define maxContextTokens and maxOutputTokens for each model. This can then be used to validate model requests. Make sure this is used in LLM service and returned by the routes.

export const DEFAULT_MODELS = {
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-5.4',
  anthropic: 'claude-sonnet-4-6',
} as const;

/**
 * Fallback chain for the Anthropic primary used by all current agents.
 * Order is cheaper+faster first (Haiku) → stable older Sonnet last.
 *
 * Entries MUST stay on Anthropic and MUST support the same feature set
 * (thinking blocks) as the primary — switching providers mid-conversation
 * corrupts message history because thinking blocks (Anthropic) and reasoning
 * items (OpenAI) only round-trip on their own provider. If a future agent
 * runs on an OpenAI or Groq primary, define a separate same-provider chain
 * for it rather than reusing this one.
 */
export const ANTHROPIC_FALLBACK_CHAIN = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20250929',
] as const;

export const availableAIModels: NewAIModel[] = [
  // Anthropic Models
  {
    name: 'Claude Opus 4.7',
    provider: 'anthropic',
    modelId: 'claude-opus-4-7',
    description:
      "Anthropic's most powerful model for complex and creative tasks",
    inputPricePerMillionTokens: 5,
    outputPricePerMillionTokens: 25,
    isActive: true,
  },
  {
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
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
    name: 'GPT-5.4',
    provider: 'openai',
    modelId: 'gpt-5.4',
    description:
      'Flagship model optimized for coding and agentic tasks with configurable reasoning effort',
    inputPricePerMillionTokens: 2.5,
    outputPricePerMillionTokens: 15,
    isActive: true,
  },
  {
    name: 'GPT-5.4 Mini',
    provider: 'openai',
    modelId: 'gpt-5.4-mini',
    description:
      'A faster, cost-efficient version of GPT-5.4 suitable for well-defined tasks and precise prompts',
    inputPricePerMillionTokens: 0.75,
    outputPricePerMillionTokens: 4.5,
    isActive: true,
  },
  {
    name: 'GPT-5.4 Nano',
    provider: 'openai',
    modelId: 'gpt-5.4-nano',
    description:
      'The fastest and most cost-efficient version of GPT-5.4, ideal for summarization and classification tasks',
    inputPricePerMillionTokens: 0.2,
    outputPricePerMillionTokens: 1.25,
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
    name: 'Llama 4 Scout 17B 16E Instruct',
    provider: 'groq',
    modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
    description: 'Meta Llama 4 Scout 17B 16E instruction model via Groq',
    inputPricePerMillionTokens: 0.11,
    outputPricePerMillionTokens: 0.34,
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
 *
 * `availableAIModels` is the single source of truth: a model is "active" iff
 * its ID appears there right now. Two-step process:
 *
 *   1. Insert any rows whose `modelId` is missing (ON CONFLICT DO NOTHING),
 *      so existing rows are never overwritten — historical conversations and
 *      analytics can still resolve the exact model row they ran on, including
 *      its name and pricing at the time.
 *
 *   2. Soft-delete every row whose `modelId` is no longer in the seed by
 *      flipping `isActive` to false. The row stays in the table for lookup;
 *      it just stops appearing in `/api/info/models` and other selectable
 *      lists. The `eq(isActive, true)` filter makes this a no-op for
 *      already-deactivated rows so `updated_at` doesn't churn each boot.
 */
export async function seedDefaultModels() {
  const { db, aiModels } = await import('@/database');
  const { and, eq, notInArray } = await import('drizzle-orm');

  const currentModelIds = availableAIModels.map((m) => m.modelId);

  await db.insert(aiModels).values(availableAIModels).onConflictDoNothing({
    target: aiModels.modelId,
  });

  await db
    .update(aiModels)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        notInArray(aiModels.modelId, currentModelIds),
        eq(aiModels.isActive, true)
      )
    );
}
