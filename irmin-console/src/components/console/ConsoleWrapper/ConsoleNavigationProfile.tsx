'use client';

import React from 'react';

import IrminUserButton from '@/components/authentication/IrminUserButton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useIAM } from '@/context/IAMContext';

import NotificationButton from './NotificationButton';

/**
 * Profile UI for the console navigation
 *
 * @remarks
 *
 * This component is used to display the profile information in the console navigation sidebar.
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 */
export default function ConsoleNavigationProfile({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { profile, isLoading } = useIAM();

  if (!profile || isLoading) {
    return (
      <div id='console-nav-profile-loading-skeleton'>
        <LoadingSkeleton className='h-8 w-full' />
      </div>
    );
  }

  return (
    <div className='flex w-full flex-wrap items-center'>
      <div className='flex w-auto items-center p-1'>
        <IrminUserButton onLinkClick={() => setIsMenuOpen(false)} />
      </div>
      <div className='w-auto overflow-hidden p-1'>
        <p className='text-sm font-normal text-foreground dark:text-gray-200'>
          {profile.user?.fullName ??
            `${profile.first_name} ${profile.last_name}`}
        </p>
      </div>
      <div className='ml-auto'>
        <NotificationButton />
      </div>
    </div>
  );
}
