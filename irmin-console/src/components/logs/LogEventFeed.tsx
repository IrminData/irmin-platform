import { memo } from 'react';

import { ButtonWithTooltip } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { LogEvent } from '@/types/core/Log';

import LogEventIcon from './LogEventIcon';

/**
 * Component to display a list of events such as audit logs.
 *
 * @param props - The props for the LogEventFeed component
 * @param props.events - List of events to display
 * @param props.loading - Optional. Whether the events are still loading
 */
const LogEventFeed = ({
  events,
  loading = false,
}: {
  events: LogEvent[];
  loading?: boolean;
}) => {
  const { dict, locale } = useLocale();

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

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
          className='bg-card/80 flex flex-col gap-4 rounded-lg px-2 py-4 md:flex-row md:items-center md:p-2'
        >
          {/* Event icon */}
          <LogEventIcon type={event.type} />
          {/* Event description and the associated object */}
          <p className='text-base text-gray-900 dark:text-gray-100'>
            {event.description}
          </p>
          <div className='flex flex-row items-center gap-2 md:ml-auto'>
            {/* Event object links */}
            {event.repository && (
              <ButtonWithTooltip
                variant='default'
                href={`${workspaceUrl}/repositories/${event.repository.slug}`}
                tooltip={event.repository.name}
              >
                {dict.repository.repository}
              </ButtonWithTooltip>
            )}
            {event.workflow_run && event.workflow ? (
              <ButtonWithTooltip
                variant='default'
                href={`${workspaceUrl}/workflows/${event.workflow.id}/run/${event.workflow_run.id}`}
                tooltip={event.workflow.name}
              >
                {dict.workflow.workflow} {dict.workflow.run}
              </ButtonWithTooltip>
            ) : (
              event.workflow && (
                <ButtonWithTooltip
                  variant='default'
                  href={`${workspaceUrl}/workflows/${event.workflow.id}`}
                  tooltip={event.workflow.name}
                >
                  {dict.workflow.workflow}
                </ButtonWithTooltip>
              )
            )}
            {event.connection && (
              <ButtonWithTooltip
                variant='default'
                href={`${workspaceUrl}/connections/${event.connection.id}`}
                tooltip={event.connection.name}
              >
                {dict.connections.connection}
              </ButtonWithTooltip>
            )}
            {/* Event timestamp and user */}
            <div className='flex w-36 flex-col'>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {new Date(event.created_at).toLocaleString(locale)}
              </span>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {event.user ? event.user.email : dict.logs.system}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(LogEventFeed);
