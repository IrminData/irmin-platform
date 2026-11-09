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

    // Structured logs are opt-in-by-usage in Sentry JS v11 (`enableLogs` was
    // removed). They are captured when `Sentry.logger.*` or a logging
    // integration is used; no init flag is required.

    // Keep PII OFF: this service authenticates via Clerk JWTs in the
    // Authorization header and workspace tokens in X-Workspace-Slug. Enabling
    // PII would forward those headers verbatim to Sentry. User/workspace
    // context should be attached explicitly via Sentry.setUser / setTag in
    // request handlers when it's actually useful for a given error.
    //
    // Sentry JS v11 replaced `sendDefaultPii` with `dataCollection`. Leaving
    // `dataCollection` unset is more permissive than v10's `sendDefaultPii:
    // false`, so this matches the documented v10-default baseline.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      },
      httpBodies: [],
      urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
  });
}
