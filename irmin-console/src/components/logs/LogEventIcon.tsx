import {
  AiOutlineDelete,
  AiOutlineInfoCircle,
  AiOutlineWarning,
} from 'react-icons/ai';
import { FaEdit, FaPlus, FaUserCheck, FaUserTimes } from 'react-icons/fa';

import { LogEventType } from '@/types/core/Log';

/**
 * Component to display an icon for a log event according to its type.
 */
const LogEventIcon = ({ type }: { type: LogEventType }) => {
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
      return <></>;
  }
};

export default LogEventIcon;
