'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import { defaultLocale, dictionaries } from '@/lib/dict';

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
  // Get the dictionary for the default locale
  const dict = dictionaries[defaultLocale];

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <WebsiteError error={error} reset={reset} dict={dict} />
      </body>
    </html>
  );
}
