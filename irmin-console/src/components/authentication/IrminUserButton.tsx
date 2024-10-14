'use client';

import Link from 'next/link';

import { UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

import ProfileImagePlaceholder from '@/components/ui/ProfileImagePlaceholder';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import LoadingSkeleton from '../ui/loading/LoadingSkeleton';

// We need to ignore and simulate clerk in offline mode
const authOfflineMode = process.env.NEXT_PUBLIC_AUTH_OFFLINE_MODE === 'true';

/**
 * Wrapper around Clerk UserButton to handle offline mode and loading states
 *
 * @param props - The component properties
 * @param props.onLinkClick - (optional) The callback function to call when the user button is clicked
 */
export default function IrminUserButton({
  onLinkClick,
}: {
  onLinkClick?: () => void;
}) {
  const { locale } = useLocale();
  const { theme } = useTheme();
  const { isLoading, profile } = useIAM();

  if (isLoading) {
    return (
      <div
        id='irmin-user-button-loading'
        className='h-8 w-8 overflow-hidden rounded-full xl:h-10 xl:w-10'
      >
        <LoadingSkeleton className='h-8 w-8' />
      </div>
    );
  }
  return (
    <div id='irmin-user-button' className='contents'>
      {!authOfflineMode ? (
        <UserButton
          appearance={{
            baseTheme: theme === 'dark' ? dark : undefined,
            variables: { colorPrimary: '#a3c2ac' },
          }}
          userProfileMode='navigation'
          userProfileUrl={`/${locale}/console/profile`}
        />
      ) : (
        <Link
          className='contents'
          href={`/${locale}/console/profile`}
          onClick={onLinkClick}
        >
          <ProfileImagePlaceholder
            user={profile}
            className='h-8 w-8 rounded-full xl:h-10 xl:w-10'
          />
        </Link>
      )}
    </div>
  );
}
