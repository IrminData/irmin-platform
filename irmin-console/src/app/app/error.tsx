'use client';

import { useEffect } from 'react';

import DashboardError from '@/components/misc/dashboardError';

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

  return <DashboardError error={error} reset={reset} />;
}
