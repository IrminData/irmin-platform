'use client';

import { UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import LoadingSkeleton from '../ui/loading/LoadingSkeleton';

/**
 * Wrapper around Clerk UserButton
 */
export default function IrminUserButton() {
  const { locale } = useLocale();
  const { resolvedTheme } = useTheme();
  const { isLoading } = useIAM();

  if (isLoading) {
    return (
      <div
        id='irmin-user-button-loading'
        className={`
          h-8 w-8 overflow-hidden rounded-full
          xl:h-10 xl:w-10
        `}
      >
        <LoadingSkeleton className='size-8' />
      </div>
    );
  }
  return (
    <div id='irmin-user-button' className='contents'>
      <UserButton
        appearance={{
          baseTheme: resolvedTheme === 'dark' ? dark : undefined,
          variables: { colorPrimary: '#a3c2ac' },
        }}
        userProfileMode='navigation'
        userProfileUrl={`/${locale}/profile`}
      />
    </div>
  );
}
