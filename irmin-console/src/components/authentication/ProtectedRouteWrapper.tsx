'use client';

import React, { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

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
const ProtectedRouteWrapper = ({ children }: { children: React.ReactNode }) => {
  const { profile, isLoading } = useIAM();
  const router = useRouter();

  // Redirect to sign-in page if not authenticated
  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/sign-in');
    }
  }, [isLoading, profile, router]);

  // Show loading skeleton while loading
  if (isLoading || !profile) {
    return (
      <div id='protected-route-loading-skeleton'>
        <LoadingSkeleton className='min-h-[80vh]' />
      </div>
    );
  }

  return children;
};

export default ProtectedRouteWrapper;
