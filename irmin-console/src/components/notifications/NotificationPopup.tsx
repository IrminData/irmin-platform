import { useRef, useState } from 'react';

import Link from 'next/link';

import { useBreakpoint } from '@/lib/utils/twUtils';

import { IoTriangle } from 'react-icons/io5';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { Notification } from '@/types/internal/Notification';

/**
 * Notification popup UI
 *
 * @remarks
 *
 * UI for displaying notifications in a popup.
 *
 * It displays a list of notifications with titles, messages and timestamps.
 *
 * This popup is shown when the user clicks on the notifications icon in the header.
 * The position of the popup is determined by the click position.
 */
const NotificationPopup = ({
  notificationsClickPosition,
}: {
  notificationsClickPosition: { x: number; y: number } | null;
}) => {
  const { dict, locale } = useLocale();
  const {
    workspaces: { currentWorkspace },
  } = useWorkspace();
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const workspaceSlug = currentWorkspace?.slug ?? '-';
  const workspaceName = currentWorkspace?.name ?? '-';

  // TODO: Implement real data fetching
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 0,
      title: 'Irmin is having a party! 🎉',
      message: 'Join us for a party at the office on Friday',
      path: `/`,
      timestamp: '2024-10-01T12:00:00Z',
      type: 'info',
    },
    {
      id: 1,
      title: 'New workspace created',
      message: 'You have created a new workspace',
      path: `/settings`,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-01T12:00:00Z',
      type: 'success',
    },
    {
      id: 2,
      title: 'Workspace updated',
      message: 'You have updated the workspace',
      path: `/settings`,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-02T12:00:00Z',
      type: 'info',
    },
    {
      id: 3,
      title: 'New user added to workspace',
      message: 'You have added a new user to the workspace',
      path: `/settings`,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-03T12:00:00Z',
      type: 'warning',
    },
    {
      id: 4,
      title: 'Data sync complete',
      message: 'Data sync for Google Analytics has been completed',
      path: `/connections`,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-04T12:00:00Z',
      type: 'success',
    },
    {
      id: 5,
      title: 'User joined workspace',
      message: 'A new user has joined the workspace',
      path: ``,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-05T12:00:00Z',
      type: 'info',
    },
    {
      id: 6,
      title: 'Connection sync failed',
      message: 'Data sync for Google Analytics has failed',
      path: `/connections`,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-06T12:00:00Z',
      type: 'warning',
    },
    {
      id: 7,
      title: 'Dataset failed to create',
      message: 'Users (public), Dataset creation has failed',
      path: ``,
      relatedWorkspaceSlug: workspaceSlug,
      relatedWorkspaceName: workspaceName,
      timestamp: '2024-09-07T12:00:00Z',
      type: 'error',
    },
  ]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 0);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const { isMd: isDesktop } = useBreakpoint('md');

  return (
    <div
      id='notification-popup'
      className={`fixed z-50`}
      style={
        isDesktop
          ? {
              top: (notificationsClickPosition?.y ?? 0) + 30,
              left: (notificationsClickPosition?.x ?? 0) - 20,
            }
          : {
              top: (notificationsClickPosition?.y ?? 0) + 30,
              left: (notificationsClickPosition?.x ?? 0) - 220,
            }
      }
    >
      <div className='max-h-[320px] w-64 overflow-y-scroll rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5'>
        <div className='absolute -top-[16px] left-auto right-[16px] z-50 -translate-x-1/2 transform text-white md:left-[22px] md:right-auto'>
          <IoTriangle size={20} />
        </div>
        <div className='sticky top-0 z-10 bg-white py-2 shadow-sm'>
          <div
            className={`px-4 ${isScrolled ? 'pt-2' : 'pt-0'} transition-all`}
          >
            <div className='flex items-center justify-between'>
              <div className='text-base font-semibold'>
                {dict.portalNavigation.notifications.notifications}
              </div>
              <Button
                onClick={clearNotifications}
                variant='link'
                colorScheme='primary'
                size='sm'
              >
                {dict.portalNavigation.notifications.clearAll}
              </Button>
            </div>
          </div>
        </div>
        <div className='py-2' ref={scrollContainerRef} onScroll={handleScroll}>
          {notifications.length > 0 ? (
            notifications
              .sort((a, b) => {
                return (
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
                );
              })
              .map((notification, index) => (
                <Link
                  href={
                    notification.relatedWorkspaceSlug
                      ? `/portal/${notification.relatedWorkspaceSlug}/${notification.path}`
                      : notification.path
                  }
                  key={`notification-${index}-${notification.id}`}
                >
                  <div
                    className={`border-b px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 ${notification.type === 'info' ? 'border-irmin_green' : ''} ${notification.type === 'warning' ? 'border-yellow-500' : ''} ${notification.type === 'error' ? 'border-red-500' : ''} ${notification.type === 'success' ? 'border-green-500' : ''} `}
                  >
                    <div className='flex justify-between'>
                      <div className='font-normal'>{notification.title}</div>
                      <div className='text-gray-500'>
                        {new Date(notification.timestamp).toLocaleString(
                          locale
                        )}
                      </div>
                    </div>
                    {notification.relatedWorkspaceName && (
                      <div className='text-irmin_green'>
                        {dict.portalNavigation.notifications.relatedWorkspace}
                        {': '}
                        {notification.relatedWorkspaceName}
                      </div>
                    )}
                    <div className='text-gray-500'>{notification.message}</div>
                  </div>
                </Link>
              ))
          ) : (
            <div className='px-4 py-2 text-sm text-gray-700'>
              {dict.portalNavigation.notifications.noNotifications}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
