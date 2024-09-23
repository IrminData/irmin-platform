import {
  AiOutlineDelete,
  AiOutlineInfoCircle,
  AiOutlineWarning,
} from 'react-icons/ai';
import { FaEdit, FaPlus, FaUserCheck, FaUserTimes } from 'react-icons/fa';

import { LogEvent, LogEventType } from '@/types/core/Log';

/**
 * Component to display a list of events such as audit logs.
 *
 * @param props - The props for the EventFeed component
 * @param props.events - List of events to display
 * @param props.systemLabel - Label to use for system events
 */
const LogEventFeed = ({
  events,
  systemLabel = 'System',
}: {
  events: LogEvent[];
  systemLabel?: string;
}) => {
  const getEventIcon = (type: LogEventType) => {
    switch (type) {
      case LogEventType.CREATE:
        return <FaPlus className='text-green-500' />;
      case LogEventType.UPDATE:
        return <FaEdit className='text-blue-500' />;
      case LogEventType.DELETE:
        return <AiOutlineDelete className='text-red-500' />;
      case LogEventType.LOGIN:
        return <FaUserCheck className='text-green-500' />;
      case LogEventType.LOGOUT:
        return <FaUserTimes className='text-gray-500' />;
      case LogEventType.WARNING:
        return <AiOutlineWarning className='text-yellow-500' />;
      case LogEventType.ERROR:
        return <AiOutlineDelete className='text-red-500' />;
      case LogEventType.INFO:
        return <AiOutlineInfoCircle className='text-blue-500' />;
      default:
        return null;
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      {events.map((event) => (
        <div
          key={event.id}
          className='flex items-center gap-4 rounded-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-800 dark:bg-irmin_black'
        >
          {/* Event icon */}
          <div>{getEventIcon(event.type)}</div>
          {/* Event description and workflow */}
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {event.description}
            </span>
            {event.workflow && (
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {event.workflow}
              </span>
            )}
          </div>
          {/* Event timestamp and user */}
          <div className='ml-auto flex w-36 flex-col'>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {new Date(event.timestamp).toLocaleString()}
            </span>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {event.user ? event.user.name : systemLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogEventFeed;
