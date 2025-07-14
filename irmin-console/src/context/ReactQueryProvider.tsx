'use client';

import type * as React from 'react';
import { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { clearQueryClient, getQueryClient } from '@/lib/getQueryClient';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // Cleanup on unmount
  useEffect(() => {
    // Only set up cleanup if we're in the browser
    if (typeof window === 'undefined') return;

    // Don't clear immediately, give a small delay to allow for navigation
    const timeoutId = setTimeout(() => {
      clearQueryClient();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
