'use client';

import React, { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useProfile } from '@/context/ProfileContext';

import LoadingSkeleton from './misc/LoadingSkeleton';

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
    return (
      <div className='px-4'>
        <LoadingSkeleton className='h-96 w-full' />
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
