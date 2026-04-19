// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import { env } from '@/config/env.server';
import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_ENABLED = env.NEXT_PUBLIC_SENTRY_ENABLED;
const SENTRY_DSN = env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,

    integrations: [nodeProfilingIntegration()],

    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,

    // Continuous profiling (v10+ API). `profileLifecycle: 'trace'` ties each
    // profile to a sampled transaction, and `profileSessionSampleRate` gates
    // what fraction of process-level profiling sessions are opened. The older
    // `profilesSampleRate` is deprecated.
    profileSessionSampleRate: env.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
    profileLifecycle: 'trace',

    // Keep PII OFF: API routes see Clerk JWTs in Authorization headers and
    // Clerk session cookies — enabling PII forwards those verbatim to Sentry.
    // When user context is genuinely useful for a specific error, attach it
    // explicitly via Sentry.setUser / setTag in the route handler.
    sendDefaultPii: false,

    enableLogs: true,
    debug: false,
  });
}
