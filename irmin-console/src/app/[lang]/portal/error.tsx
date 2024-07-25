'use client';

import { useEffect } from 'react';

import PortalError from '@/components/misc/portalError';

/**
 * Error component for the portal
 *
 * @remarks
 *
 * Shown when a fatal error occurs in the portal.
 * Such as route not found, server error, etc.
 *
 * Normal API call failures should be handled by the UI.
 *
 * @param param0 - Error and reset function
 * @returns Error component
 */
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
