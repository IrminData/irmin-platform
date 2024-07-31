'use client';

import React, { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useIAM } from '@/context/IAMContext';

/**
 * Protected route wrapper
 *
 * @remarks
 *
 * This component is used to protect routes that require authentication.
 * It checks if the user is authenticated and redirects to the sign-in page if not.
 *
 * It is used by the portal layout to wrap routes.
 *
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 *
 * @param protectedRoute - Route to protect from unauthorised access
 * @param protectedRoute.children - Route content
 *
 * @returns If authorised, the route content, otherwise nothing
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, isLoading } = useIAM();
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
