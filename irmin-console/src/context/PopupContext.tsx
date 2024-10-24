'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import Alert from '@/components/ui/popup/Alert';
import Confirm from '@/components/ui/popup/Confirm';
import Modal from '@/components/ui/popup/Modal';

/**
 * Context to use and show alerts, confirmations and modals
 *
 * @remarks
 *
 * This context is used to show, hide and update {@link Alert}, {@link Confirm} and {@link Modal} components.
 *
 * When shown, these components will be rendered on top of the current view,
 * in the console layout.
 *
 * @param irminAlert - Function to show an alert
 * @param irminConfirm - Async function to show a confirmation popup, resolves to a boolean (confirmed or not)
 * @param irminModal - Object with functions to show and close a modal
 *
 * @returns The popup context
 */
const PopupContext = createContext<{
  irminAlert: (
    _type: 'success' | 'error' | 'info',
    _message: string | JSX.Element
  ) => void;
  irminConfirm: (
    _type: 'warning' | 'info',
    _message: string
  ) => Promise<boolean>;
  irminModal: {
    show: (
      _title: string,
      _content: React.JSX.Element,
      _onClose?: () => void
    ) => void;
    close: () => void;
  };
}>({
  irminAlert: () => {},
  irminConfirm: async () => false,
  irminModal: {
    show: () => {},
    close: () => {},
  },
});

export const PopupProvider = ({ children }: { children: React.ReactNode }) => {
  // Handle alerts
  const [alertMessage, setAlertMessage] = useState<string | JSX.Element | null>(
    null
  );
  const [alertType, setAlertType] = useState<
    'success' | 'error' | 'info' | null
  >(null);
  const irminAlert = (
    type: 'success' | 'error' | 'info',
    message: string | JSX.Element
  ) => {
    setAlertType(type);
    setAlertMessage(message);
    setTimeout(() => {
      setAlertType(null);
      setAlertMessage(null);
    }, 10000);
  };

  // Handle confirmations
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<'warning' | 'info' | null>(
    null
  );
  const [confirmOnSelect, setConfirmOnSelect] = useState<
    null | ((_confirmed: boolean) => void)
  >(null);
  const irminConfirm = useCallback(
    async (type: 'warning' | 'info', message: string) => {
      setConfirmType(type);
      setConfirmMessage(message);
      return new Promise<boolean>((resolve) => {
        setConfirmOnSelect((confirmed: boolean) => {
          resolve(confirmed);
        });
      });
    },
    []
  );

  // Handle modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.JSX.Element | null>(
    null
  );
  const [modalOnClose, setModalOnClose] = useState<null | (() => void)>(null);
  const showIrminModal = useCallback(
    (title: string, content: React.JSX.Element, onClose?: () => void) => {
      setModalTitle(title);
      setModalContent(content);
      if (onClose) setModalOnClose(() => onClose);
      setModalOpen(true);
    },
    []
  );
  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (modalOnClose) {
      modalOnClose();
    }
  }, [modalOnClose]);

  return (
    <PopupContext.Provider
      value={{
        irminAlert: irminAlert,
        irminConfirm: irminConfirm,
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
      {confirmMessage && confirmType && (
        <Confirm
          type={confirmType}
          message={confirmMessage}
          onSelect={(confirmed) => {
            setConfirmMessage(null);
            if (typeof confirmOnSelect === 'function')
              confirmOnSelect(confirmed);
          }}
        />
      )}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          title={modalTitle}
          onClose={() => {
            setModalOpen(false);
            if (typeof modalOnClose === 'function') modalOnClose();
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
export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within the PopupProvider');
  }
  return context;
};
