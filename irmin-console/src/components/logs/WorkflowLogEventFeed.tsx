import { WorkflowLogEvent } from '@/types/core/Log';

import LogEventIcon from './LogEventIcon';

/**
 * Component to display a list of events such as audit logs.
 *
 * @param props - The props for the EventFeed component
 * @param props.events - List of events to display
 * @param props.systemLabel - Label to use for system events
 */
const WorkflowLogEventFeed = ({
  events,
  systemLabel = 'System',
}: {
  events: WorkflowLogEvent[];
  systemLabel?: string;
}) => {
  return (
    <div className='flex flex-col gap-4'>
      {events.map((event) => (
        <div
          key={event.id}
          className='flex items-center gap-4 rounded-lg border border-gray-300 bg-card p-2 dark:border-gray-800'
        >
          {/* Event icon */}
          <LogEventIcon type={event.type} />
          {/* Event description and workflow */}
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {event.description}
            </span>
            {event.workflow && (
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {event.workflow.name}
              </span>
            )}
          </div>
          {/* Event timestamp and user */}
          <div className='ml-auto flex w-36 flex-col'>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {new Date(event.timestamp).toLocaleString()}
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

export default WorkflowLogEventFeed;
