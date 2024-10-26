'use client';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useIAM } from '@/context/IAMContext';

import UserProfileForm from './UserProfileForm';

/**
 * User profile section
 */
export default function ProfileSection() {
  const { profile } = useIAM();
  return (
    <div
      id='profile-section'
      className='container relative mx-auto my-8 max-w-6xl'
    >
      <div className='w-full max-w-3xl rounded-lg border-b border-t border-accent bg-background px-4 py-4 shadow-md md:mx-4'>
        <div className='my-8 px-4'>
          {!profile ? (
            <LoadingSkeleton className='h-96 w-full' />
          ) : (
            <UserProfileForm />
          )}
        </div>
      </div>
    </div>
  );
}
