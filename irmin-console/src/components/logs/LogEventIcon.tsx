import {
  AiOutlineDelete,
  AiOutlineInfoCircle,
  AiOutlineWarning,
} from 'react-icons/ai';
import { FaEdit, FaPlus, FaUserCheck, FaUserTimes } from 'react-icons/fa';

import type { LogEventType } from '@/types/core/Log';

/**
 * Component to display an icon for a log event according to its type.
 */
const LogEventIcon = ({ type }: { type: LogEventType }) => {
  switch (type) {
    case 'CREATE':
      return <FaPlus className='text-green-500' size={22} />;
    case 'UPDATE':
      return <FaEdit className='text-blue-500' size={22} />;
    case 'DELETE':
      return <AiOutlineDelete className='text-red-500' size={22} />;
    case 'LOGIN':
      return <FaUserCheck className='text-green-500' size={22} />;
    case 'LOGOUT':
      return <FaUserTimes className='text-gray-500' size={22} />;
    case 'WARNING':
      return <AiOutlineWarning className='text-yellow-500' size={22} />;
    case 'ERROR':
      return <AiOutlineDelete className='text-red-500' size={22} />;
    case 'INFO':
      return <AiOutlineInfoCircle className='text-blue-500' size={22} />;
    default:
      return <></>;
  }
};

export default LogEventIcon;
