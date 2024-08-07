'use client';

import { useEffect } from 'react';

import WebsiteError from '@/components/website/websiteError';

/**
 * Error page (Website)
 *
 * @param param0 - Error properties
 */
export default function WebsiteErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <WebsiteError error={error} reset={reset} />;
}
