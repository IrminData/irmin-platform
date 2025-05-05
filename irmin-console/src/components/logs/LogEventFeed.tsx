import { memo } from 'react';

import { useLocale } from '@/context/LocaleContext';

import { Connection } from '@/types/core/Connection';
import { LogEvent } from '@/types/core/Log';
import { Repository } from '@/types/core/Repository';
import { Workflow } from '@/types/core/Workflow';

import LogEventIcon from './LogEventIcon';

/**
 * Component to display a list of events such as audit logs.
 *
 * @param props - The props for the LogEventFeed component
 * @param props.events - List of events to display
 * @param props.subject - Optional. The object associated with the events
 * @param props.systemLabel - Label to use for system events
 * @param props.loading - Optional. Whether the events are still loading
 */
const LogEventFeed = ({
  events,
  subject,
  systemLabel = 'System',
  loading = false,
}: {
  events: LogEvent[];
  subject?: Repository | Workflow | Connection;
  systemLabel?: string;
  loading?: boolean;
}) => {
  const { dict, locale } = useLocale();

  if (loading) {
    return (
      <div className='flex flex-col gap-4'>
        {/* show 10 skeleton rows */}
        {[...Array(10)].map((_, index) => (
          <div
            key={index}
            className='bg-card/80 flex animate-pulse items-center gap-4 rounded-lg p-2'
          >
            {/* icon placeholder */}
            <div className='h-6 w-6 rounded bg-gray-300 dark:bg-gray-700' />
            {/* text placeholders */}
            <div className='flex-1'>
              <div className='h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-700' />
            </div>
            {/* timestamp and user placeholders */}
            <div className='ml-auto flex flex-col gap-1'>
              <div className='h-3 w-1/2 rounded bg-gray-300 dark:bg-gray-700' />
              <div className='h-3 w-1/3 rounded bg-gray-300 dark:bg-gray-700' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className='py-8 text-center text-lg text-gray-600 lg:text-2xl dark:text-gray-400'>
        {dict.logs.noLogsFound}
      </p>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      {events.map((event) => (
        <div
          key={event.id}
          className='bg-card/80 flex items-center gap-4 rounded-lg p-2'
        >
          {/* Event icon */}
          <LogEventIcon type={event.type} />
          {/* Event description and the associated object */}
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {event.description}
            </span>
            {subject && (
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {subject.name}
              </span>
            )}
          </div>
          {/* Event timestamp and user */}
          <div className='ml-auto flex w-36 flex-col'>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {new Date(event.created_at).toLocaleString(locale)}
            </span>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {event.user ? event.user.email : systemLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(LogEventFeed);
