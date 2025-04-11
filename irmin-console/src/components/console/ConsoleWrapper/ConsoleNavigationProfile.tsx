'use client';

import React from 'react';

import NotificationsButton from '@/components/NotificationsButton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import IrminUserButton from '@/components/user/IrminUserButton';

import { useIAM } from '@/context/IAMContext';

/**
 * Profile UI for the console navigation
 *
 * @remarks
 *
 * This component is used to display the profile information in the console navigation sidebar.
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 */
export default function ConsoleNavigationProfile() {
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
        <IrminUserButton />
      </div>
      <div className='w-auto overflow-hidden p-1'>
        <p className='text-foreground text-sm font-normal dark:text-gray-200'>
          {`${profile.first_name} ${profile.last_name}`}
        </p>
      </div>
      <div className='ml-auto'>
        <NotificationsButton profile={profile} />
      </div>
    </div>
  );
}
