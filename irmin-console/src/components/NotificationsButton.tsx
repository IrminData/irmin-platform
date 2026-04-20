'use client';

import { memo } from 'react';

import { useRouter } from 'next/navigation';

import { clientEnv } from '@/config/env.client';
import { Inbox, Notifications } from '@novu/react';
import { dark } from '@novu/react/themes';
import { useTheme } from 'next-themes';

import { TbBell } from 'react-icons/tb';

import {
  handleNotificationPrimaryAction,
  handleNotificationSecondaryAction,
} from '@/components/notificationHandlers';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import type { User } from '@/types/core/User';

const novuApplicationIdentifier = clientEnv.NEXT_PUBLIC_NOVU_APP_ID ?? '';

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
        {/* asChild so PopoverTrigger doesn't inject its own styled <button>.
            The wrapping <button> here stays borderless and borrows the
            sidebar chrome styling of the ThemeSwitch beside it. Without
            this the native button renders with user-agent default borders
            on Chromium, which clashed against ThemeSwitch's ghost variant
            and read as a grouped-bordered pair in the sidebar. */}
        <PopoverTrigger asChild>
          <button
            type='button'
            aria-label='Notifications'
            className={`
              inline-flex size-10 cursor-pointer items-center justify-center
              rounded-[2px] border-0 bg-transparent text-foreground
              transition-colors duration-150
              hover:bg-muted
              focus-visible:outline-1 focus-visible:outline-offset-1
              focus-visible:outline-accent/70
            `}
          >
            <TbBell className='size-4 opacity-60' aria-hidden='true' />
          </button>
        </PopoverTrigger>
        <PopoverContent className='h-[600px] w-[400px] p-0'>
          <Notifications
            onPrimaryActionClick={(notification) =>
              handleNotificationPrimaryAction(notification, router)
            }
            onSecondaryActionClick={handleNotificationSecondaryAction}
          />
        </PopoverContent>
      </Popover>
    </Inbox>
  );
};

export default memo(NotificationsButton);
