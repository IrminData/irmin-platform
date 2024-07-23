import React from 'react';

import { TbBell } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

const NotificationButton = () => {
  const { dict } = useLocale();
  const { toggleNotificationsPopup } = usePopup();
  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ): void => {
    toggleNotificationsPopup(e as React.MouseEvent<HTMLButtonElement>);
  };

  return (
    <div id='notification-popup'>
      <button
        onClick={handleClick}
        className='transitiona-all block max-w-max text-irmin_green hover:text-irmin_green-300'
        aria-label={dict.portalNavigation.notifications.toggle}
      >
        <TbBell className='text-3xl' />
      </button>
    </div>
  );
};

export default NotificationButton;
