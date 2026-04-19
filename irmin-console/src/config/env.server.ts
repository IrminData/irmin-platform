/**
 * Server-side env loader. Exports `env` — `clientEnv` merged with every
 * server-only var (secrets, runtime toggles, Sentry server config), all
 * Zod-validated. One import covers every env var a server consumer needs.
 *
 * Importing this from a client component is a build error: the first line
 * pulls in `server-only`, which Next.js's bundler rejects in client bundles.
 * That's what keeps secrets out of the browser.
 *
 * Validation failures throw on module load (not `process.exit` — edge
 * runtime compatible). The schema also enforces cross-field rules like
 * "ENV_PASSWORD required when REQUIRE_ENV_AUTH=true in production".
 *
 * See README.md § "Accessing env vars in code".
 */
import 'server-only';
import { z } from 'zod';

import { clientEnv, sampleRate } from './env.client';

const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  REQUIRE_ENV_AUTH: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  ENV_PASSWORD: z.string().optional(),
  HMAC_SECRET: z.string().optional(),
  CLERK_SECRET_KEY: z.string().min(1),
  NOVU_SECRET_KEY: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_URL: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: sampleRate(0.1),
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: sampleRate(0.1),
  TEST_USER_EMAIL: z.string().optional(),
  TEST_USER_PASSWORD: z.string().optional(),
  TEST_USER_WORKSPACE: z.string().optional(),
  TEST_USER_WORKSPACE_SLUG: z.string().optional(),
  TEST_USER_REPOSITORY: z.string().optional(),
  TEST_USER_REPOSITORY_SLUG: z.string().optional(),
});

// Skip strict parsing during static analysis (knip, lint-only runs).
const isStaticAnalysis =
  process.env.npm_lifecycle_event === 'knip' ||
  process.env.npm_lifecycle_event === 'knip:fix' ||
  process.env.npm_lifecycle_event === 'validate' ||
  process.env.KNIP === 'true' ||
  process.env.STATIC_ANALYSIS === 'true';

const envToParse = isStaticAnalysis
  ? {
      ...process.env,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? 'mock-clerk-secret',
    }
  : process.env;

const result = serverSchema.safeParse(envToParse);

if (!result.success) {
  console.error('Server env validation failed:');

  console.error(z.prettifyError(result.error));
  throw new Error('Invalid server environment variables');
}

// ENV_PASSWORD is required when env auth is on in production.
if (
  result.data.REQUIRE_ENV_AUTH &&
  result.data.NODE_ENV === 'production' &&
  !result.data.ENV_PASSWORD
) {
  throw new Error(
    'ENV_PASSWORD must be set when REQUIRE_ENV_AUTH=true in production'
  );
}

export const env = {
  ...clientEnv,
  ...result.data,
};
