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
 * @param irminConfirm - Async function to show a confirmation popup with a consequence-specific action label; resolves to a boolean
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
    _message: string,
    _confirmLabel: string
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
 * `WorkspaceProvider` that exist below the root layout.
 */
type PopupRenderState = {
  alertState: {
    id: number;
    type: 'error' | 'info' | 'success';
    message: JSX.Element | string;
    onClose: () => void;
  } | null;
  confirmState: {
    type: 'info' | 'warning';
    message: string;
    confirmLabel: string;
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
          key={alertState.id}
          type={alertState.type}
          message={alertState.message}
          onClose={alertState.onClose}
        />
      )}
      {confirmState && (
        <Confirm
          type={confirmState.type}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
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
 * is mounted deeper in the tree (e.g. inside a `WorkspaceProvider`), it takes
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
  const [alertId, setAlertId] = useState(0);
  const alertIdRef = useRef(0);
  const irminAlert = useCallback(
    (type: 'error' | 'info' | 'success', message: JSX.Element | string) => {
      alertIdRef.current += 1;
      setAlertType(type);
      setAlertMessage(message);
      setAlertId(alertIdRef.current);
    },
    []
  );
  const closeIrminAlert = useCallback((id?: number) => {
    if (id !== undefined && id !== alertIdRef.current) return;
    setAlertType(null);
    setAlertMessage(null);
  }, []);
  const closeCurrentAlert = useCallback(
    () => closeIrminAlert(alertId),
    [alertId, closeIrminAlert]
  );

  // Handle confirmations
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmLabel, setConfirmLabel] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<'info' | 'warning' | null>(
    null
  );
  const confirmResolverRef = useRef<((_value: boolean) => void) | null>(null);
  const handleConfirmSelection = useCallback((confirmed: boolean) => {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
    setConfirmMessage(null);
    setConfirmLabel(null);
    setConfirmType(null);
  }, []);
  const irminConfirm = useCallback(
    (
      type: 'info' | 'warning',
      message: string,
      consequenceLabel: string
    ): Promise<boolean> => {
      // A second request supersedes the visible one; settle the first promise
      // instead of leaving its caller suspended indefinitely.
      confirmResolverRef.current?.(false);
      setConfirmType(type);
      setConfirmMessage(message);
      setConfirmLabel(consequenceLabel);

      return new Promise<boolean>((resolve) => {
        confirmResolverRef.current = resolve;
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
      setModalOnClose(onClose ? () => onClose : null);
      setModalOpen(true);
    },
    []
  );
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalContent(null);
    if (modalOnClose && typeof modalOnClose === 'function') modalOnClose();
    setModalOnClose(null);
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
    setConfirmLabel(null);
    confirmResolverRef.current?.(false);
    confirmResolverRef.current = null;
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
          ? {
              id: alertId,
              type: alertType,
              message: alertMessage,
              onClose: closeCurrentAlert,
            }
          : null,
      confirmState:
        confirmMessage && confirmType && confirmLabel
          ? {
              type: confirmType,
              message: confirmMessage,
              confirmLabel,
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
      alertId,
      closeCurrentAlert,
      confirmMessage,
      confirmType,
      confirmLabel,
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
 * Place this inside context providers (like `WorkspaceProvider`) so that
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
