'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import ConsoleErrorSection from '@/components/console/ConsoleErrorSection';

/**
 * Error component for the console
 *
 * @remarks
 *
 * Shown when a fatal error occurs in the console.
 * Such as route not found, server error, etc.
 *
 * Normal API call failures should be handled by the UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ConsoleErrorSection error={error} reset={reset} />;
}
