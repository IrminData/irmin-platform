'use client';

import React from 'react';

import NotificationsButton from '@/components/NotificationsButton';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import IrminUserButton from '@/components/user/IrminUserButton';

import { useIAM } from '@/context/IAMContext';

/**
 * Profile, theme switch, and notifications button UI for the console navigation sidebar
 */
export default function ConsoleNavigationProfile({
  isMenuFolded,
}: {
  isMenuFolded: boolean;
}) {
  const { profile, isLoading } = useIAM();

  if (!profile || isLoading) {
    return (
      <div id='console-nav-profile-loading-skeleton'>
        <LoadingSkeleton className='h-8 w-full' />
      </div>
    );
  }

  if (isMenuFolded) {
    return (
      <div className='flex flex-col gap-2'>
        <IrminUserButton />
        <ThemeSwitch />
        <NotificationsButton profile={profile} />
      </div>
    );
  }

  return (
    <div className='flex w-full flex-wrap items-center'>
      <div className='flex w-auto items-center p-1'>
        <IrminUserButton />
      </div>
      <div className='w-auto overflow-hidden p-1'>
        <p
          className={`
            text-xs font-normal text-foreground
            dark:text-gray-200
          `}
        >
          {`${profile.first_name} ${profile.last_name}`}
        </p>
      </div>
      <div className='ml-auto flex items-center'>
        <ThemeSwitch />
        <NotificationsButton profile={profile} />
      </div>
    </div>
  );
}
