'use client';

import { createContext, useContext, useState } from 'react';
import Alert from '@/components/misc/Alert';
import ConfirmPopup from '@/components/misc/ConfirmPopup';

const PopupContext = createContext<{
  irminAlert: (type: 'success' | 'error' | 'info', message: string) => void;
  irminConfirm: (
    type: 'success' | 'error' | 'info',
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
}>({
  irminAlert: () => {},
  irminConfirm: () => {},
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

  return (
    <PopupContext.Provider
      value={{
        irminAlert: irminAlert,
        irminConfirm: irminConfirm,
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
    </PopupContext.Provider>
  );
};

export const usePopup = () => useContext(PopupContext);
