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

// Skip strict parsing during static analysis (knip, lint-only runs) and
// during `next build` page-data collection. Railway doesn't pass every
// server secret to the Docker builder (they're runtime-only in the
// preview env), and even where they exist, cross-service template refs
// often haven't been substituted yet. At real runtime Next.js sets
// `NEXT_PHASE=phase-production-server`, this module re-evaluates with
// resolved values, and strict validation runs — so genuinely missing
// secrets still surface on the deployed pod. The escape hatch ONLY
// softens the build phase and does not require any user-side env var.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isStaticAnalysis =
  process.env.npm_lifecycle_event === 'knip' ||
  process.env.npm_lifecycle_event === 'knip:fix' ||
  process.env.npm_lifecycle_event === 'validate' ||
  process.env.KNIP === 'true' ||
  process.env.STATIC_ANALYSIS === 'true' ||
  isBuildPhase;

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

  if (!isStaticAnalysis) {
    throw new Error('Invalid server environment variables');
  }
}

// ENV_PASSWORD is required when env auth is on in production. This check
// is skipped during the build phase for the same reason as the schema
// escape hatch above: Railway runtime secrets aren't all available to the
// Docker builder, but they are at real runtime.
if (
  result.success &&
  !isStaticAnalysis &&
  result.data.REQUIRE_ENV_AUTH &&
  result.data.NODE_ENV === 'production' &&
  !result.data.ENV_PASSWORD
) {
  throw new Error(
    'ENV_PASSWORD must be set when REQUIRE_ENV_AUTH=true in production'
  );
}

// In static-analysis / build mode we fall back to the envToParse values
// (with the mocked CLERK_SECRET_KEY) so types still align with the
// schema's output shape. At real runtime the strict check above runs
// again with resolved env and throws on genuinely missing secrets.
export const env = {
  ...clientEnv,
  ...(result.success
    ? result.data
    : (envToParse as unknown as z.infer<typeof serverSchema>)),
} as typeof clientEnv & z.infer<typeof serverSchema>;
