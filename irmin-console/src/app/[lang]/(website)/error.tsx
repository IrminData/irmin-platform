'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import WebsiteError from '@/components/website/websiteError';

/**
 * Error page (Website)
 */
export default function WebsiteErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <WebsiteError error={error} reset={reset} />;
}
