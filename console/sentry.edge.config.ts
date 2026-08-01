// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import { env } from '@/config/env.server';
import * as Sentry from '@sentry/nextjs';

const SENTRY_ENABLED = env.NEXT_PUBLIC_SENTRY_ENABLED;
const SENTRY_DSN = env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,

    // Keep PII OFF: middleware sees Clerk session cookies and Authorization
    // headers on every request — enabling PII would forward them to Sentry.
    // Attach user context explicitly via Sentry.setUser when needed.
    sendDefaultPii: false,

    enableLogs: true,
    debug: false,
  });
}
