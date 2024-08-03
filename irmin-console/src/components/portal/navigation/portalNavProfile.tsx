'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

import { useIAM } from '@/context/IAMContext';

/**
 * Profile UI for the portal navigation
 *
 * @remarks
 *
 * This component is used to display the profile information in the portal navigation sidebar.
 * Uses {@link useIAM} to interact with the user's identity and APIs.
 */
export default function PortalNavProfile({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { profile, isLoading } = useIAM();

  if (!profile || isLoading) {
    return <LoadingSkeleton className='h-8 w-full' />;
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
        <h2 className='mb-1 text-sm font-normal text-irmin_green'>
          {profile.name ?? ''}
        </h2>
        <p className='m-0 text-xs font-light text-irmin_green opacity-60'>
          {profile.email ?? ''}
        </p>
      </div>
    </Link>
  );
}
