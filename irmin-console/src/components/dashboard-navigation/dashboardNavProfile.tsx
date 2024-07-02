'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useProfile } from '@/context/ProfileContext';

import LoadingSkeleton from '../misc/LoadingSkeleton';

export default function DashboardNavProfile({
  setIsMenuOpen,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const profile = useProfile();

  if (!profile.profile) {
    return <LoadingSkeleton className='h-12 w-full' />;
  }

  return (
    <div className='flex flex-wrap'>
      <div className='w-auto p-2'>
        <Link
          href='/app/profile'
          onClick={() => {
            setIsMenuOpen(false);
          }}
        >
          <Image
            src='/ui-assets/elements/avatar.webp'
            alt={profile.profile.name ?? ''}
            width={50}
            height={50}
            className='rounded-full'
          />
        </Link>
      </div>
      <div className='w-auto overflow-hidden p-2'>
        <Link href='/app/profile'>
          <h2 className='mb-1 text-xs font-semibold text-irmin_green md:text-sm xl:text-base'>
            {profile.profile.name ?? ''}
          </h2>
          <p className='mb-1 text-xs font-light text-irmin_green md:text-sm xl:text-base'>
            {profile.profile.email ?? ''}
          </p>
          <p className='text-xs font-light text-irmin_green'>
            {profile.profile.company ?? ''}
          </p>
        </Link>
      </div>
    </div>
  );
}
