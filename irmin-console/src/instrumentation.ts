import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

export async function register() {
  if (!isProduction) {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = isProduction
  ? Sentry.captureRequestError
  : undefined;
