'use client';

import { memo } from 'react';

import { useRouter } from 'next/navigation';

import { Inbox, InboxContent } from '@novu/react';
import { dark } from '@novu/react/themes';
import { useTheme } from 'next-themes';

import type { User } from '@/types/core/User';

const novuApplicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '';

/**
 * Notifications inbox component with preferences page
 *
 * This component is used to display the notifications inbox with the preferences page using Novu.
 * It renders everything the Notifications component does, but with the addition of the Preferences page
 * to allow users to manage their notification settings directly from the component.
 *
 * @param props
 * @param props.profile - The user profile object
 */
const NotificationsInbox = ({ profile }: { profile: User }) => {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  if (!profile.id) return <></>;

  return (
    <Inbox
      applicationIdentifier={novuApplicationIdentifier}
      subscriberId={profile.id}
      routerPush={(path: string) => router.push(path)}
      appearance={{
        variables: {
          colorPrimary: '#a3c2ac',
        },
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
      }}
    >
      <InboxContent
        onPrimaryActionClick={(_notification) => {
          // TODO: Implement primary action click handler - should navigate to relevant page or perform action based on notification type
          // console.log('Primary action clicked', notification);
        }}
        onSecondaryActionClick={(_notification) => {
          // TODO: Implement secondary action click handler - typically for dismissing, marking as read, or alternative action
          // console.log('Secondary action clicked', notification);
        }}
      />
    </Inbox>
  );
};

export default memo(NotificationsInbox);
