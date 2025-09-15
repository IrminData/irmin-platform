'use client';

import { memo } from 'react';

import { useRouter } from 'next/navigation';

import { Inbox, Notifications } from '@novu/react';
import { dark } from '@novu/react/themes';
import { useTheme } from 'next-themes';

import { TbBell } from 'react-icons/tb';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import type { User } from '@/types/core/User';

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
      <Popover>
        <PopoverTrigger>
          <TbBell
            className='size-4 w-full opacity-60'
            aria-label='Notifications'
          />
        </PopoverTrigger>
        <PopoverContent className='h-[600px] w-[400px] p-0'>
          <Notifications
            onPrimaryActionClick={(_notification) => {
              // TODO: Implement primary action click handler - should navigate to relevant page or perform action based on notification type
              // console.log('Primary action clicked', notification);
            }}
            onSecondaryActionClick={(_notification) => {
              // TODO: Implement secondary action click handler - typically for dismissing, marking as read, or alternative action
              // console.log('Secondary action clicked', notification);
            }}
          />
        </PopoverContent>
      </Popover>
    </Inbox>
  );
};

export default memo(NotificationsButton);
