'use client';

import { useRouter } from 'next/navigation';

import { Inbox } from '@novu/react';
import { dark } from '@novu/react/themes';
import { useTheme } from 'next-themes';

import { TbBell } from 'react-icons/tb';

import { User } from '@/types/core/User';

const isOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
const novuApplicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '';

/**
 * Notifications inbox component and bell button
 *
 * This component is used to display the notifications inbox and the bell button using Novu.
 *
 * @param props
 * @param props.profile - The user profile object
 */
const NotificationsButton = ({ profile }: { profile: User }) => {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  if (isOfflineMode) {
    return <TbBell className='text-xl text-accent' />;
  }
  if (!profile.clerk_id) return <></>;
  return (
    <Inbox
      applicationIdentifier={novuApplicationIdentifier}
      subscriberId={profile.clerk_id}
      routerPush={(path: string) => router.push(path)}
      appearance={{
        variables: {
          colorPrimary: '#a3c2ac',
        },
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
      }}
      onPrimaryActionClick={(notification) => {
        // TODO: logic to handle primary action click
        console.log('Primary action clicked', notification);
      }}
      onSecondaryActionClick={(notification) => {
        // TODO: logic to handle secondary action click
        console.log('Secondary action clicked', notification);
      }}
    />
  );
};

export default NotificationsButton;
