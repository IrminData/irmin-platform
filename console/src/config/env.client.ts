/**
 * Client-safe env loader. Exports `clientEnv` with every `NEXT_PUBLIC_*` var,
 * Zod-validated. Safe to import from anywhere; server code should prefer
 * `env.server.ts` which layers server-only vars on top.
 *
 * The `raw` object below must reference every NEXT_PUBLIC_ key textually —
 * Next.js only inlines `process.env.NEXT_PUBLIC_FOO` at build time when the
 * key appears literally. NODE_ENV is intentionally not modelled (Next.js
 * inlines it directly).
 *
 * See README.md § "Accessing env vars in code".
 */
import { z } from 'zod';

/**
 * Parse a numeric sample rate env var with safe fallback + clamping to [0, 1].
 * Any malformed or out-of-range value falls back rather than silently
 * disabling (0) or over-sampling.
 */
export const sampleRate = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return fallback;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
      return n;
    });

const clientSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.url().default('http://localhost:3000'),
  NEXT_PUBLIC_WEBSITE_URL: z.url().default('https://irmin.dev'),
  NEXT_PUBLIC_API_DOCS_URL: z.url().default('https://docs.irmin.dev'),
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_AI_API_URL: z.url(),
  NEXT_PUBLIC_REVALIDATE: z.string().default('60').transform(Number),
  NEXT_PUBLIC_BILLING_DISABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NEXT_PUBLIC_PRESIGNED_UPLOAD_THRESHOLD_MB: z
    .string()
    .default('20')
    .transform(Number),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().default('https://eu.i.posthog.com'),
  NEXT_PUBLIC_NOVU_APP_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: sampleRate(0.15),
  NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: sampleRate(0.1),
  NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE: sampleRate(1.0),
});

// Literal keys are required: Next.js inlines `process.env.NEXT_PUBLIC_*` at
// build time only when each key is referenced textually. A spread or dynamic
// access would leave the client bundle with `undefined` values.
const raw = {
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL,
  NEXT_PUBLIC_API_DOCS_URL: process.env.NEXT_PUBLIC_API_DOCS_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_AI_API_URL: process.env.NEXT_PUBLIC_AI_API_URL,
  NEXT_PUBLIC_REVALIDATE: process.env.NEXT_PUBLIC_REVALIDATE,
  NEXT_PUBLIC_BILLING_DISABLED: process.env.NEXT_PUBLIC_BILLING_DISABLED,
  NEXT_PUBLIC_PRESIGNED_UPLOAD_THRESHOLD_MB:
    process.env.NEXT_PUBLIC_PRESIGNED_UPLOAD_THRESHOLD_MB,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_NOVU_APP_ID: process.env.NEXT_PUBLIC_NOVU_APP_ID,
  NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE,
};

// Skip strict parsing during static analysis (knip, lint-only runs) and
// during `next build` page-data collection. At build time, Railway-style
// templated refs like `https://${{service.RAILWAY_PUBLIC_DOMAIN}}` often
// haven't been substituted yet (cross-service domain refs are unavailable
// to the Docker builder in PR preview envs, where the referenced service
// isn't attached to the preview environment). Railway resolves those refs
// when the deployed pod actually starts.
//
// At real runtime Next.js sets `NEXT_PHASE=phase-production-server`, this
// module re-evaluates with resolved values, and validation runs strictly —
// so genuinely broken env still surfaces the first time a page renders on
// the deployed pod. This escape hatch ONLY softens the build phase and does
// not require any user-side env var.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isStaticAnalysis =
  process.env.npm_lifecycle_event === 'knip' ||
  process.env.npm_lifecycle_event === 'knip:fix' ||
  process.env.npm_lifecycle_event === 'validate' ||
  process.env.KNIP === 'true' ||
  process.env.STATIC_ANALYSIS === 'true' ||
  isBuildPhase;

const result = clientSchema.safeParse(raw);

if (!result.success) {
  console.error('Client env validation failed:');

  console.error(z.prettifyError(result.error));

  if (!isStaticAnalysis) {
    throw new Error('Invalid client environment variables');
  }
}

// NODE_ENV is intentionally not modelled here: Next.js hard-codes it at build
// time on both runtimes, so client consumers can keep reading
// `process.env.NODE_ENV` directly.
//
// In static-analysis / build mode we fall back to the *raw* values so types
// still match the schema's output shape where defaults aren't strings.
// That's fine because at real runtime the strict check above runs again and
// throws on genuinely invalid vars.
export const clientEnv = (
  result.success
    ? result.data
    : (raw as unknown as z.infer<typeof clientSchema>)
) as z.infer<typeof clientSchema>;
