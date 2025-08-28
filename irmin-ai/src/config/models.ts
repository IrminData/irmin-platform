import type { NewAIModel } from '@/database';

export const defaultAIModels: NewAIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    inputPricePerToken: 0.000005,
    outputPricePerToken: 0.000015,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    inputPricePerToken: 0.00000015,
    outputPricePerToken: 0.0000006,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctions: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    inputPricePerToken: 0.0000005,
    outputPricePerToken: 0.0000015,
    maxTokens: 16385,
    supportsStreaming: true,
    supportsFunctions: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Groq Models
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B',
    provider: 'groq',
    modelId: 'llama-3.1-70b-versatile',
    inputPricePerToken: 0.00000059,
    outputPricePerToken: 0.00000079,
    maxTokens: 131072,
    supportsStreaming: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    inputPricePerToken: 0.00000005,
    outputPricePerToken: 0.00000008,
    maxTokens: 131072,
    supportsStreaming: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    modelId: 'mixtral-8x7b-32768',
    inputPricePerToken: 0.00000024,
    outputPricePerToken: 0.00000024,
    maxTokens: 32768,
    supportsStreaming: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Seed default AI models in the database
 */
export async function seedDefaultModels() {
  const { db, aiModels } = await import('@/database');
  const { eq } = await import('drizzle-orm');

  for (const modelData of defaultAIModels) {
    const existing = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.id, modelData.id!));
    if (!existing.length) {
      await db.insert(aiModels).values(modelData);
    }
  }
}
