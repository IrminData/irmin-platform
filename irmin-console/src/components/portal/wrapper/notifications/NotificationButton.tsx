import React from 'react';

import { PiBell } from 'react-icons/pi';

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
        className='block max-w-max text-irmin_blue transition-all hover:text-irmin_teal dark:text-irmin_teal dark:hover:text-irmin_blue'
        aria-label={dict.portalNavigation.notifications.toggle}
      >
        <PiBell className='text-xl' />
      </button>
    </div>
  );
};

export default NotificationButton;
