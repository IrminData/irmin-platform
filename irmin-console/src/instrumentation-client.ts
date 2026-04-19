import { clientEnv } from '@/config/env.client';
import * as Sentry from '@sentry/nextjs';

const SENTRY_ENABLED = clientEnv.NEXT_PUBLIC_SENTRY_ENABLED;
const SENTRY_DSN = clientEnv.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // NODE_ENV is inlined into the client bundle automatically by Next.js and is
    // sufficient to distinguish dev vs prod client events. Finer-grained env tags
    // (staging, preview, etc.) only exist on the server where SENTRY_ENVIRONMENT
    // is readable.
    environment: process.env.NODE_ENV,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    tracesSampleRate: clientEnv.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    replaysSessionSampleRate:
      clientEnv.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate:
      clientEnv.NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE,

    // Keep PII OFF: the browser sends Clerk session cookies on every request,
    // and enabling PII would attach them to outgoing Sentry events. Session
    // replay still has its own text/input masking defaults (unrelated to this
    // flag). Attach user context explicitly via Sentry.setUser on login.
    sendDefaultPii: false,

    enableLogs: true,

    // Drop known-noise events before they hit the wire so they don't burn
    // project quota. These are things that are never actionable for us.
    ignoreErrors: [
      // Stale clients after a deploy — user reloads and it's gone
      /Loading chunk \d+ failed/,
      /ChunkLoadError/,
      /Failed to fetch dynamically imported module/,
      // Harmless browser internals
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // User-side network issues, not ours
      'Network request failed',
      'NetworkError when attempting to fetch resource',
      'Load failed',
      'TypeError: Failed to fetch',
    ],
    denyUrls: [
      // Browser extensions injecting scripts into our pages
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^safari-web-extension:\/\//i,
      /extensions\//i,
    ],
  });
}

// Instruments router navigations. No-op when Sentry is disabled.
export const onRouterTransitionStart =
  SENTRY_ENABLED && SENTRY_DSN
    ? Sentry.captureRouterTransitionStart
    : undefined;
