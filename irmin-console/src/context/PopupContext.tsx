'use client';

import { createContext, useContext, useState } from 'react';

import Alert from '@/components/misc/Alert';
import ConfirmPopup from '@/components/misc/ConfirmPopup';
import Modal from '@/components/misc/Modal';
import NotificationPopup from '@/components/notifications/NotificationPopup';

const PopupContext = createContext<{
  irminAlert: (_type: 'success' | 'error' | 'info', _message: string) => void;
  irminConfirm: (
    _type: 'success' | 'error' | 'info',
    _message: string,
    _onConfirm: () => void,
    _onCancel: () => void
  ) => void;
  toggleNotificationsPopup: (
    _e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  irminModal: {
    show: (
      _title: string,
      _content: React.ReactNode,
      _onClose: () => void
    ) => void;
    close: () => void;
  };
}>({
  irminAlert: () => {},
  irminConfirm: () => {},
  toggleNotificationsPopup: () => {},
  irminModal: {
    show: () => {},
    close: () => {},
  },
});

/**
 * Provider for the popup context to handle alerts, confirmations, notifications and modals
 *
 * @remarks
 *
 * Used to show, hide and update NotificationPopup, Alert, ConfirmPopup and Modal components.
 * When shown, these components will be rendered on top of the current view.
 *
 * @param children - The children components
 * @returns The popup provider component
 */
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
    }, 10000);
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

  // Handle modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(
    null
  );
  const [modalOnClose, setModalOnClose] = useState<() => void>(() => {});
  const showIrminModal = (
    title: string,
    content: React.ReactNode,
    onClose: () => void
  ) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOnClose(onClose);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    if (modalOnClose) {
      modalOnClose();
    }
  };

  return (
    <PopupContext.Provider
      value={{
        irminAlert: irminAlert,
        irminConfirm: irminConfirm,
        toggleNotificationsPopup,
        irminModal: {
          show: showIrminModal,
          close: closeModal,
        },
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
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          title={modalTitle}
          onClose={() => {
            setModalOpen(false);
            if (modalOnClose) {
              modalOnClose();
            }
          }}
        >
          {modalContent}
        </Modal>
      )}
    </PopupContext.Provider>
  );
};

/**
 * Hook to use the popup context
 */
export const usePopup = () => useContext(PopupContext);
