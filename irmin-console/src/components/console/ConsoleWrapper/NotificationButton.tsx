import React from 'react';

import { PiBell } from 'react-icons/pi';

import { ButtonWithTooltip } from '@/components/ui/button';

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
      <ButtonWithTooltip
        onClick={handleClick}
        aria-label={dict.consoleNavigation.notifications.toggle}
        type='button'
        size='icon'
        variant='ghost'
        icon={<PiBell size={19} />}
        tooltip={dict.consoleNavigation.notifications.toggle}
      />
    </div>
  );
};

export default NotificationButton;
