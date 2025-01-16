'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import WebsiteError from '@/components/WebsiteError';

/**
 * Global error page to display when an error occurs
 *
 * @param props - Error and reset function
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <WebsiteError error={error} reset={reset} />
      </body>
    </html>
  );
}
