import { config } from 'dotenv';
import { z } from 'zod';

config();

// Skip validation during static analysis (knip, etc.)
const isStaticAnalysis =
  process.env.npm_lifecycle_event === 'knip' ||
  process.env.KNIP === 'true' ||
  process.env.STATIC_ANALYSIS === 'true';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  AI_API_SYSTEM_TOKEN: z
    .string()
    .min(
      1,
      'AI API system token is required; used to authenticate system level requests to the AI API'
    ),
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  GROQ_API_KEY: z.string().min(1, 'Groq API key is required to run inference'),
  OPENAI_API_KEY: z
    .string()
    .min(
      1,
      'OpenAI API key is required to run inference and create embeddings'
    ),
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, 'Anthropic API key is required to run inference'),
  IRMIN_API_BASE_URL: z
    .string()
    .default('https://irmin-development.up.railway.app'),
  LANGSMITH_TRACING: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  LANGSMITH_API_KEY: z.string().min(1, 'Langsmith API key is required'),
  LANGSMITH_PROJECT: z.string().default('irmin-ai-agents-dev'),
  QDRANT_URL: z
    .string()
    .default('http://localhost:6333')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'QDRANT_URL must start with http:// or https://',
    }),
  QDRANT_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  QDRANT_API_KEY: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default('https://localhost:3000,http://localhost:8082'),
  CORS_CREDENTIALS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  TEST_IRMIN_AUTH_TOKEN: z.string().optional(),
  TEST_WORKSPACE_SLUG: z.string().optional(),
});

// During static analysis, provide mock values to avoid validation errors
// This allows tools like knip to analyze the codebase without real env vars
const envToParse = isStaticAnalysis
  ? {
      ...process.env,
      AI_API_SYSTEM_TOKEN: process.env.AI_API_SYSTEM_TOKEN || 'mock-token',
      DATABASE_URL:
        process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock',
      GROQ_API_KEY: process.env.GROQ_API_KEY || 'mock-groq-key',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'mock-openai-key',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'mock-anthropic-key',
      LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY || 'mock-langsmith-key',
    }
  : process.env;

const result = envSchema.safeParse(envToParse);

if (!result.success) {
  console.error('Environment validation failed:');
  console.error(result.error.format());
  process.exit(1);
}

export const env = result.data;
