import { env } from '@/config/env.server';
import * as Sentry from '@sentry/nextjs';

const SENTRY_ENABLED = env.NEXT_PUBLIC_SENTRY_ENABLED;
const SENTRY_DSN = env.NEXT_PUBLIC_SENTRY_DSN ?? '';

export async function register() {
  if (!SENTRY_ENABLED || !SENTRY_DSN) {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError =
  SENTRY_ENABLED && SENTRY_DSN ? Sentry.captureRequestError : undefined;
