'use client';

import {
  createContext,
  type JSX,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

type PopupContextType = {
  irminAlert: (
    _type: 'error' | 'info' | 'success',
    _message: JSX.Element | string
  ) => void;
  irminConfirm: (
    _type: 'info' | 'warning',
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
};

const PopupContext = createContext<PopupContextType>({
  irminAlert: () => {},
  irminConfirm: async () => false,
  irminModal: {
    show: () => {},
    close: () => {},
  },
});

/**
 * Internal context that exposes popup render state to {@link PopupOutlet}.
 *
 * This allows popup UI (alerts, confirms, modals) to be rendered at any depth
 * in the React tree, so popup content can inherit context providers like
 * {@link WorkspaceProvider} that exist below the root layout.
 */
type PopupRenderState = {
  alertState: {
    type: 'error' | 'info' | 'success';
    message: JSX.Element | string;
    onClose: () => void;
  } | null;
  confirmState: {
    type: 'info' | 'warning';
    message: string;
    onSelect: (_confirmed: boolean) => void;
  } | null;
  modalState: {
    open: boolean;
    title: string;
    content: React.JSX.Element | null;
    onClose: () => void;
  } | null;
};

const PopupRenderContext = createContext<PopupRenderState | null>(null);

/**
 * Stable context for outlet registration. Separated from {@link PopupRenderContext}
 * to avoid a circular dependency: registering an outlet changes `hasOutlet`, which
 * would recompute the render state, which would re-trigger the outlet's effect.
 */
const PopupOutletRegistrationContext = createContext<(() => () => void) | null>(
  null
);

/**
 * Renders the popup UI elements (Alert, Confirm, Modal) based on the current
 * popup render state.
 */
const PopupRenderer = ({ renderState }: { renderState: PopupRenderState }) => {
  const { alertState, confirmState, modalState } = renderState;

  return (
    <>
      {alertState && (
        <Alert
          type={alertState.type}
          message={alertState.message}
          onClose={alertState.onClose}
        />
      )}
      {confirmState && (
        <Confirm
          type={confirmState.type}
          message={confirmState.message}
          onSelect={confirmState.onSelect}
        />
      )}
      {modalState?.open && (
        <Modal
          isOpen={modalState.open}
          title={modalState.title}
          onClose={modalState.onClose}
        >
          {modalState.content}
        </Modal>
      )}
    </>
  );
};

/**
 * Provides popup state management for the entire application.
 *
 * By default, renders popup UI at this level in the tree. If a {@link PopupOutlet}
 * is mounted deeper in the tree (e.g. inside a {@link WorkspaceProvider}), it takes
 * over rendering so popup content inherits those deeper contexts.
 */
export const PopupProvider = ({ children }: { children: React.ReactNode }) => {
  // Handle alerts
  const [alertMessage, setAlertMessage] = useState<JSX.Element | string | null>(
    null
  );
  const [alertType, setAlertType] = useState<
    'error' | 'info' | 'success' | null
  >(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const irminAlert = useCallback(
    (type: 'error' | 'info' | 'success', message: JSX.Element | string) => {
      // Clear any existing timeout to prevent stale dismissals
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      setAlertType(type);
      setAlertMessage(message);
      alertTimeoutRef.current = setTimeout(() => {
        setAlertType(null);
        setAlertMessage(null);
        alertTimeoutRef.current = null;
      }, 10000);
    },
    []
  );
  const closeIrminAlert = useCallback(() => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setAlertType(null);
    setAlertMessage(null);
  }, []);

  // Handle confirmations
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<'info' | 'warning' | null>(
    null
  );
  const [confirmResolver, setConfirmResolver] = useState<
    ((_value: boolean) => void) | null
  >(null);
  const handleConfirmSelection = useCallback(
    (confirmed: boolean) => {
      if (confirmResolver) {
        confirmResolver(confirmed); // Resolve the stored promise
        setConfirmResolver(null); // Clear the resolver
      }
      setConfirmMessage(null);
      setConfirmType(null);
    },
    [confirmResolver]
  );
  const irminConfirm = useCallback(
    (type: 'info' | 'warning', message: string): Promise<boolean> => {
      setConfirmType(type);
      setConfirmMessage(message);

      return new Promise<boolean>((resolve) => {
        setConfirmResolver(() => resolve); // Store the resolver function
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
  const [modalOnClose, setModalOnClose] = useState<(() => void) | null>(null);
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
    if (modalOnClose && typeof modalOnClose === 'function') modalOnClose();
  }, [modalOnClose]);

  // Clear all popup state — used when the outlet unmounts to prevent stale
  // workspace-scoped content from being rendered by the root fallback renderer.
  // Uses the state updater form to access the current confirm resolver without
  // depending on it (keeps this callback stable).
  const clearAllPopups = useCallback(() => {
    setAlertType(null);
    setAlertMessage(null);
    setConfirmType(null);
    setConfirmMessage(null);
    setConfirmResolver((prev: ((_value: boolean) => void) | null) => {
      if (prev) prev(false);
      return null;
    });
    setModalOpen(false);
    setModalContent(null);
    setModalOnClose(null);
  }, []);

  // Outlet registration — when a PopupOutlet is mounted, it takes over rendering.
  // On unmount the unregister function also clears all popups so the root fallback
  // renderer doesn't attempt to render content that depends on workspace context.
  const [hasOutlet, setHasOutlet] = useState(false);
  const registerOutlet = useCallback(() => {
    setHasOutlet(true);
    return () => {
      clearAllPopups();
      setHasOutlet(false);
    };
  }, [clearAllPopups]);

  const value = useMemo(
    () => ({
      irminAlert: irminAlert,
      irminConfirm: irminConfirm,
      irminModal: {
        show: showIrminModal,
        close: closeModal,
      },
    }),
    [irminAlert, irminConfirm, showIrminModal, closeModal]
  );

  const renderState = useMemo<PopupRenderState>(
    () => ({
      alertState:
        alertMessage && alertType
          ? { type: alertType, message: alertMessage, onClose: closeIrminAlert }
          : null,
      confirmState:
        confirmMessage && confirmType
          ? {
              type: confirmType,
              message: confirmMessage,
              onSelect: handleConfirmSelection,
            }
          : null,
      modalState: modalOpen
        ? {
            open: modalOpen,
            title: modalTitle,
            content: modalContent,
            onClose: closeModal,
          }
        : null,
    }),
    [
      alertMessage,
      alertType,
      closeIrminAlert,
      confirmMessage,
      confirmType,
      handleConfirmSelection,
      modalOpen,
      modalTitle,
      modalContent,
      closeModal,
    ]
  );

  return (
    <PopupContext.Provider value={value}>
      <PopupOutletRegistrationContext.Provider value={registerOutlet}>
        <PopupRenderContext.Provider value={renderState}>
          {children}
          {!hasOutlet && <PopupRenderer renderState={renderState} />}
        </PopupRenderContext.Provider>
      </PopupOutletRegistrationContext.Provider>
    </PopupContext.Provider>
  );
};

/**
 * Renders popup UI at its position in the React tree, taking over from the
 * default renderer in {@link PopupProvider}.
 *
 * Place this inside context providers (like {@link WorkspaceProvider}) so that
 * popup content (modals, alerts, confirms) inherits those contexts.
 *
 * @example
 * ```tsx
 * <WorkspaceProvider workspaceSlug={slug}>
 *   {children}
 *   <PopupOutlet />
 * </WorkspaceProvider>
 * ```
 */
export const PopupOutlet = () => {
  const registerOutlet = useContext(PopupOutletRegistrationContext);
  const renderState = useContext(PopupRenderContext);

  useEffect(() => {
    if (!registerOutlet) return;
    const unregister = registerOutlet();
    return unregister;
  }, [registerOutlet]);

  if (!renderState) return null;

  return <PopupRenderer renderState={renderState} />;
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
