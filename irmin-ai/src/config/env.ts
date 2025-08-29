import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('localhost'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DB_FILE_NAME: z.string().default('file:local.db'),
  GROQ_API_KEY: z.string().min(1, 'Groq API key is required to run inference'),
  OPENAI_API_KEY: z
    .string()
    .min(
      1,
      'OpenAI API key is required to run inference and create embeddings'
    ),
  IRMIN_API_BASE_URL: z
    .string()
    .default('https://irmin-development.up.railway.app'),
  LANGSMITH_TRACING: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  LANGSMITH_API_KEY: z.string().min(1, 'Langsmith API key is required'),
  LANGSMITH_PROJECT: z.string(),
  CORS_ORIGINS: z
    .string()
    .default('https://localhost:3000,http://localhost:8082'),
  CORS_CREDENTIALS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Environment validation failed:');
  console.error(result.error.format());
  process.exit(1);
}

export const env = result.data;
