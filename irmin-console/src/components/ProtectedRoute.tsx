'use client';

import React, { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useProfile } from '@/context/ProfileContext';

/**
 * Protected route wrapper
 *
 * @remarks
 *
 * This component is used to protect routes that require authentication.
 * It checks if the user is authenticated and redirects to the sign-in page if not.
 *
 * It is used by the portal layout to wrap routes.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/sign-in');
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return <></>;
  }

  return children;
};

export default ProtectedRoute;
