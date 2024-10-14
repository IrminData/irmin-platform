'use client';

import { UserProfile } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

/**
 * User profile section
 */
export default function ProfileSection() {
  const { theme } = useTheme();

  return (
    <div
      id='profile-section'
      className='container mx-auto mb-16 flex max-w-7xl flex-wrap py-16 md:mb-0 md:py-28'
    >
      <UserProfile
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
          variables: { colorPrimary: '#a3c2ac' },
        }}
      />
    </div>
  );
}
