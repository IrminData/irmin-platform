import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import Link from 'next/link';
import { IoTriangle } from 'react-icons/io5';

interface IrminNotification {
  id: number;
  title: string;
  message: string;
  page: string;
  relatedWorkspace: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

const NotificationPopup = ({
  notificationsClickPosition,
}: {
  notificationsClickPosition: { x: number; y: number } | null;
}) => {
  const { currentWorkspace } = useWorkspace();
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const workspaceSlug = currentWorkspace?.slug ?? 'test-workspace';

  const [notifications, setNotifications] = useState<IrminNotification[]>([
    {
      id: 1,
      title: 'New workspace created',
      message: 'You have created a new workspace',
      page: `settings`,
      relatedWorkspace: workspaceSlug,
      timestamp: '2024-09-01T12:00:00Z',
      type: 'success',
    },
    {
      id: 2,
      title: 'Workspace updated',
      message: 'You have updated the workspace',
      page: `settings`,
      relatedWorkspace: workspaceSlug,
      timestamp: '2024-09-02T12:00:00Z',
      type: 'info',
    },
    {
      id: 3,
      title: 'New user added to workspace',
      message: 'You have added a new user to the workspace',
      page: `settings`,
      relatedWorkspace: workspaceSlug,
      timestamp: '2024-09-03T12:00:00Z',
      type: 'warning',
    },
    {
      id: 4,
      title: 'Data sync complete',
      message: 'Data sync for Google Analytics has been completed',
      page: `connections`,
      relatedWorkspace: workspaceSlug,
      timestamp: '2024-09-04T12:00:00Z',
      type: 'success',
    },
    {
      id: 5,
      title: 'User joined workspace',
      message: 'A new user has joined the workspace',
      page: `settings`,
      relatedWorkspace: workspaceSlug,
      timestamp: '2024-09-05T12:00:00Z',
      type: 'info',
    },
    {
      id: 6,
      title: 'Connection sync failed',
      message: 'Data sync for Google Analytics has failed',
      page: `connections`,
      relatedWorkspace: workspaceSlug,
      timestamp: '2024-09-06T12:00:00Z',
      type: 'warning',
    },
    {
      id: 7,
      title: 'Data set failed to create',
      message: 'Users (public), data set creation has failed',
      page: `data`,
      relatedWorkspace: workspaceSlug,
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

  return (
    <div
      id='notification-popup'
      className={`fixed z-50`}
      style={{
        top: (notificationsClickPosition?.y ?? 0) + 30,
        left: (notificationsClickPosition?.x ?? 0) - 20,
      }}
    >
      <div className='max-h-[320px] w-64 overflow-y-scroll rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5'>
        <div className='absolute -top-[16px] left-[22px] z-50 -translate-x-1/2 transform text-white'>
          <IoTriangle size={20} />
        </div>
        <div className='sticky top-0 z-10 bg-white py-2 shadow-sm'>
          <div
            className={`px-4 ${isScrolled ? 'pt-2' : 'pt-0'} transition-all`}
          >
            <div className='flex items-center justify-between'>
              <div className='text-lg font-bold'>Notifications</div>
              <button
                onClick={clearNotifications}
                className='text-xs text-ash_gray hover:underline'
              >
                Clear All
              </button>
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
                  href={`/app/${notification.relatedWorkspace}/${notification.page}`}
                  key={`notification-${index}-${notification.id}`}
                >
                  <div
                    className={`border-b px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 ${notification.type === 'info' ? 'border-ash_gray' : ''} ${notification.type === 'warning' ? 'border-yellow-500' : ''} ${notification.type === 'error' ? 'border-red-500' : ''} ${notification.type === 'success' ? 'border-green-500' : ''} `}
                  >
                    <div className='flex justify-between'>
                      <div className='font-normal'>{notification.title}</div>
                      <div className='text-gray-500'>
                        {new Date(notification.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className='text-gray-500'>{notification.message}</div>
                  </div>
                </Link>
              ))
          ) : (
            <div className='px-4 py-2 text-sm text-gray-700'>
              No notifications
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
