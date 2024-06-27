'use client';

import { createContext, useContext, useState } from 'react';
import Alert from '@/components/misc/Alert';
import ConfirmPopup from '@/components/misc/ConfirmPopup';
import NotificationPopup from '@/components/notifications/NotificationPopup';

const PopupContext = createContext<{
  irminAlert: (type: 'success' | 'error' | 'info', message: string) => void;
  irminConfirm: (
    type: 'success' | 'error' | 'info',
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
  toggleNotificationsPopup: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}>({
  irminAlert: () => {},
  irminConfirm: () => {},
  toggleNotificationsPopup: (
    _: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {},
});

export const PopupProvider = ({ children }: { children: React.ReactNode }) => {
  // Handle alerts
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<
    'success' | 'error' | 'info' | null
  >(null);
  const irminAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertType(type);
    setAlertMessage(message);
    setTimeout(() => {
      setAlertType(null);
      setAlertMessage(null);
    }, 5000);
  };

  // Handle confirmations
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<
    'success' | 'error' | 'info' | null
  >(null);
  const [confirmSuccess, setConfirmSuccess] = useState<(() => void) | null>(
    null
  );
  const [confirmCancel, setConfirmCancel] = useState<(() => void) | null>(null);
  const irminConfirm = (
    type: 'success' | 'error' | 'info',
    message: string,
    confirmSuccess: () => void,
    confirmCancel: () => void
  ) => {
    setConfirmType(type);
    setConfirmMessage(message);
    setConfirmSuccess(confirmSuccess);
    setConfirmCancel(confirmCancel);
    setTimeout(() => {
      setConfirmType(null);
      setConfirmMessage(null);
      setConfirmSuccess(null);
      setConfirmCancel(null);
    }, 10000);
  };

  // Handle notifications
  const [notificationsPopupOpen, setNotificationsPopupOpen] = useState(false);
  const [notificationsClickPosition, setNotificationsClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const toggleNotificationsPopup = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    setNotificationsClickPosition({ x: e.clientX, y: e.clientY });
    setNotificationsPopupOpen(!notificationsPopupOpen);
  };

  return (
    <PopupContext.Provider
      value={{
        irminAlert: irminAlert,
        irminConfirm: irminConfirm,
        toggleNotificationsPopup,
      }}
    >
      {children}
      {alertMessage && alertType && (
        <Alert
          type={alertType}
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
      {confirmMessage && confirmType && confirmSuccess && confirmCancel && (
        <ConfirmPopup
          type={confirmType}
          message={confirmMessage}
          onConfirm={() => {
            confirmSuccess();
            setConfirmMessage(null);
          }}
          onCancel={() => {
            confirmCancel();
            setConfirmMessage(null);
          }}
        />
      )}
      {notificationsPopupOpen && (
        <NotificationPopup
          notificationsClickPosition={notificationsClickPosition}
        />
      )}
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
