'use client';

import { useEffect } from 'react';

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
 *
 * @param param0 - Error and reset function
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ConsoleErrorSection error={error} reset={reset} />;
}
