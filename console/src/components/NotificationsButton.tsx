'use client';

import { memo } from 'react';

import { useRouter } from 'next/navigation';

import { getAlmanacPrimaryColor } from '@/config/appearance';
import { clientEnv } from '@/config/env.client';
import { Inbox, Notifications } from '@novu/react';
import { dark } from '@novu/react/themes';
import { useTheme } from 'next-themes';

import { TbBell } from 'react-icons/tb';

import {
  handleNotificationPrimaryAction,
  handleNotificationSecondaryAction,
} from '@/components/notificationHandlers';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useLocale } from '@/context/LocaleContext';

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
  const { dict } = useLocale();
  if (!profile.id) return <></>;
  return (
    <Inbox
      applicationIdentifier={novuApplicationIdentifier}
      subscriberId={profile.id}
      routerPush={(path: string) => router.push(path)}
      appearance={{
        variables: {
          colorPrimary: getAlmanacPrimaryColor(resolvedTheme),
        },
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size='icon'
            variant='ghost'
            aria-label={dict.common.notifications}
          >
            <TbBell className='size-4 opacity-60' aria-hidden='true' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={`
            h-[600px] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)]
            max-w-[400px] overflow-hidden p-0
          `}
        >
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
