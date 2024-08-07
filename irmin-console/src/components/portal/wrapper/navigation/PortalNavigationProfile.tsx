'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

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
      <div className='flex w-auto items-center p-2'>
        <Image
          src='/ui-assets/elements/avatar.webp'
          alt={profile.name ?? ''}
          width={50}
          height={50}
          className='h-10 w-10 rounded-full'
        />
      </div>
      <div className='w-auto overflow-hidden p-2'>
        <h2 className='mb-1 text-sm font-normal text-gray-400'>
          {profile.name ?? ''}
        </h2>
        <p className='m-0 text-xs font-light text-gray-400 opacity-60'>
          {profile.email ?? ''}
        </p>
      </div>
    </Link>
  );
}
