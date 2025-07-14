'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import { defaultLocale } from '@/lib/dict';

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
    <html lang={defaultLocale}>
      <body>
        <WebsiteError error={error} reset={reset} locale={defaultLocale} />
      </body>
    </html>
  );
}
