'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import WebsiteFooter from '@/components/website/footer/WebsiteFooter';
import WebsiteNavigation from '@/components/website/navigation/WebsiteNavigation';
import WebsiteError from '@/components/website/websiteError';

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
        <WebsiteNavigation />
        <WebsiteError error={error} reset={reset} />
        <WebsiteFooter />
      </body>
    </html>
  );
}
