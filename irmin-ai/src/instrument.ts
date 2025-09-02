import * as Sentry from '@sentry/node';

import { env } from './config/env';

Sentry.init({
  dsn: env.SENTRY_DSN,
  debug: env.NODE_ENV === 'production' ? false : true,
  environment: env.NODE_ENV,
  release: process.env.npm_package_version || '1.0.0',

  // Send structured logs to Sentry
  enableLogs: true,
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
