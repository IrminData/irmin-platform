'use client';

import {
  almanacClerkElements,
  getAlmanacPrimaryColor,
} from '@/config/appearance';
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
          size-8 overflow-hidden rounded-full
          xl:size-10
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
          theme: resolvedTheme === 'dark' ? dark : undefined,
          elements: almanacClerkElements,
          variables: {
            colorPrimary: getAlmanacPrimaryColor(resolvedTheme),
          },
        }}
        userProfileMode='navigation'
        userProfileUrl={`/${locale}/profile`}
      />
    </div>
  );
}
