import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import { env } from './config/env';

if (env.SENTRY_ENABLED && env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    // `||` (not `??`) so an empty-string SENTRY_ENVIRONMENT falls back to NODE_ENV
    // rather than tagging events with "".
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    release: process.env.npm_package_version || '1.0.0',

    integrations: [Sentry.httpIntegration(), nodeProfilingIntegration()],

    // Tracing
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,

    // Continuous profiling (v10+ API). `profileLifecycle: 'trace'` ties each
    // profile to a sampled transaction, and `profileSessionSampleRate` gates
    // what fraction of process-level profiling sessions are opened. The older
    // `profilesSampleRate` is deprecated.
    profileSessionSampleRate: env.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
    profileLifecycle: 'trace',

    // Send structured logs to Sentry
    enableLogs: true,

    // Keep PII OFF: this service authenticates via Clerk JWTs in the
    // Authorization header and workspace tokens in X-Workspace-Slug. Enabling
    // PII would forward those headers verbatim to Sentry. User/workspace
    // context should be attached explicitly via Sentry.setUser / setTag in
    // request handlers when it's actually useful for a given error.
    sendDefaultPii: false,
  });
}
