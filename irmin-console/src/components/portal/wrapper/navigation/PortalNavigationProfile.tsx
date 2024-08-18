'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import ProfileImagePlaceholder from '@/components/common/ProfileImagePlaceholder';
import NotificationButton from '@/components/portal/wrapper/notifications/NotificationButton';

import { useIAM } from '@/context/IAMContext';

/**
 * Profile UI for the portal navigation
 *
 * @remarks
 *
 * This component is used to display the profile information in the portal navigation sidebar.
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 */
export default function PortalNavigationProfile({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { profile, isLoading } = useIAM();

  if (!profile || isLoading) {
    return (
      <div id='portal-nav-profile-loading-skeleton'>
        <LoadingSkeleton className='h-8 w-full' />
      </div>
    );
  }

  return (
    <div className='flex w-full flex-wrap items-center'>
      <Link
        className='contents'
        href='/portal/profile'
        onClick={() => {
          setIsMenuOpen(false);
        }}
      >
        <div className='flex w-auto items-center p-1'>
          {profile.profile_picture ? (
            <Image
              src={profile.profile_picture}
              alt={profile.name ?? ''}
              width={50}
              height={50}
              className='h-8 w-8 rounded-full xl:h-10 xl:w-10'
            />
          ) : (
            <ProfileImagePlaceholder
              user={profile}
              className='h-8 w-8 rounded-full xl:h-10 xl:w-10'
            />
          )}
        </div>
        <div className='w-auto overflow-hidden p-1'>
          <p className='text-sm font-normal text-irmin_black dark:text-irmin_green'>
            {profile.name ?? ''}
          </p>
        </div>
      </Link>
      <div className='ml-auto'>
        <NotificationButton />
      </div>
    </div>
  );
}
