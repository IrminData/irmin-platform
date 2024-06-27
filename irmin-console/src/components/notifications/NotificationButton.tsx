import React from 'react';
import { TbBell } from 'react-icons/tb';
import { usePopup } from '@/context/PopupContext';

const NotificationButton = () => {
  const { toggleNotificationsPopup } = usePopup();
  return (
    <div id='notification-popup'>
      <button
        className='block max-w-max text-ash_gray hover:text-ash_gray-800'
        onClick={(e) => toggleNotificationsPopup(e)}
      >
        <TbBell className='text-3xl' />
      </button>
    </div>
  );
};

export default NotificationButton;
