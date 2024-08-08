'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
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
    <Link
      className='flex w-full flex-wrap items-center'
      href='/portal/profile'
      onClick={() => {
        setIsMenuOpen(false);
      }}
    >
      <div className='flex w-auto items-center p-1'>
        <Image
          src='/ui-assets/elements/avatar.webp'
          alt={profile.name ?? ''}
          width={40}
          height={40}
          className='h-8 w-8 rounded-full'
        />
      </div>
      <div className='w-auto overflow-hidden p-1'>
        <h2 className='text-sm font-normal text-irmin_black'>
          {profile.name ?? ''}
        </h2>
        <p className='m-0 text-xs font-light text-irmin_blue'>
          {profile.email ?? ''}
        </p>
      </div>
      <div className='ml-auto'>
        <NotificationButton />
      </div>
    </Link>
  );
}
