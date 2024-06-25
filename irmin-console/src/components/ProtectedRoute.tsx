'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/context/ProfileContext';
import LoadingSpinner from './misc/LoadingSpinner';

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
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
