'use client';

import { useEffect } from 'react';

import PortalError from '@/components/misc/portalError';

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

  return <PortalError error={error} reset={reset} />;
}
