'use client';

import { useEffect, useState } from 'react';

import * as Sentry from '@sentry/nextjs';

import type { Locale } from '@/lib/dict';
import { defaultLocale, detectLocaleFromURL } from '@/lib/dict';

import WebsiteError from '@/components/WebsiteError';

/**
 * Global error page — renders when the root layout itself crashes, so it
 * lives outside LocaleProvider. Detects locale from the URL path at mount
 * (e.g. `/fi/...` → Finnish) and falls back to the default otherwise.
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
  const [locale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return defaultLocale;
    return detectLocaleFromURL(window.location.href) ?? defaultLocale;
  });

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang={locale}>
      <body>
        <WebsiteError error={error} reset={reset} locale={locale} />
      </body>
    </html>
  );
}
