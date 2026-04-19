'use client';

import AuthenticationErrorHandler from '@/components/ui/error/AuthenticationErrorHandler';

import { useIAM } from '@/context/IAMContext';

/**
 * Client-side wrapper that reads authError from IAMContext and passes it to
 * AuthenticationErrorHandler. Kept as a small adapter so the server-component
 * layout (authentication/layout.tsx) can stay a server component while the
 * handler itself runs client-side.
 */
export default function AuthenticationErrorHandlerConnected({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authError } = useIAM();
  return (
    <AuthenticationErrorHandler error={authError}>
      {children}
    </AuthenticationErrorHandler>
  );
}
