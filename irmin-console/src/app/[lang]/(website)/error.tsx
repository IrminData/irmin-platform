'use client';

import { useEffect } from 'react';

import WebsiteError from '@/components/misc/websiteError';

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

  return <WebsiteError error={error} reset={reset} />;
}
