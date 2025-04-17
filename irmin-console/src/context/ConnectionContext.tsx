'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connection } from '@/types/core/Connection';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Connection context properties
 */
interface ConnectionContextProps {
  connection: Connection;
  fetchConnection: () => Promise<void>;
  deleteConnection: () => Promise<void>;
  updateConnection: (data: ItemUpdateProps) => Promise<void>;
  transferConnection: (ownerID: string) => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextProps | undefined>(
  undefined
);

/**
 * Connection context for state management and interactions with one of the connections in the workspace
 */
export const ConnectionProvider = ({
  children,
  workspaceSlug,
  connectionID,
  defaultConnection,
}: {
  children: React.ReactNode;
  workspaceSlug: string;
  connectionID: string;
  defaultConnection: Connection;
}) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();

  // Track if the connection is being updated
  const updating = useRef(false);

  // Active Connection for the context
  const [connection, setConnection] = useState(defaultConnection);

  const fetchConnection = useCallback(async () => {
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newConnection = await irminCore.connectionService.fetchConnection({
        workspace: workspaceSlug,
        connectionID,
      });
      if (!newConnection.data) return;
      setConnection(newConnection.data);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the connection'
      );
    }
  }, [connectionID, workspaceSlug, irminAlert, getToken, locale]);

  const handleDeleteConnection = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${connection.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.connectionService.deleteConnection({
        workspace: workspaceSlug,
        connectionID: connection.id,
      });
      irminAlert('success', res.message ?? 'Connection deleted successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the connection'
      );
    } finally {
      updating.current = false;
    }
  }, [
    connection,
    workspaceSlug,
    dict,
    irminAlert,
    irminConfirm,
    getToken,
    locale,
  ]);

  const handleUpdateConnection = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.connectionService.updateConnection({
          workspace: workspaceSlug,
          connectionID: connection.id,
          name: data.name,
          description: data.description,
          documentation: data.documentation,
        });
        await fetchConnection();
        irminAlert('success', res.message ?? 'Connection updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error updating the connection'
        );
      } finally {
        updating.current = false;
      }
    },
    [connection, workspaceSlug, fetchConnection, irminAlert, getToken, locale]
  );

  const handleTransferOwnershipConnection = useCallback(
    async (ownerID: string) => {
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToTransferOwnership} (${connection.name})`
      );
      if (updating.current || !confirmed) return;
      try {
        updating.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.connectionService.transferConnection({
          workspace: workspaceSlug,
          connectionID: connection.id,
          newOwner: ownerID,
        });
        await fetchConnection();
        irminAlert(
          'success',
          res.message ?? 'Connection transfered successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error transfering the connection'
        );
      } finally {
        updating.current = false;
      }
    },
    [
      connection,
      dict,
      workspaceSlug,
      fetchConnection,
      irminAlert,
      irminConfirm,
      locale,
      getToken,
    ]
  );

  return (
    <ConnectionContext.Provider
      value={{
        connection,
        fetchConnection,
        deleteConnection: handleDeleteConnection,
        updateConnection: handleUpdateConnection,
        transferConnection: handleTransferOwnershipConnection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

/**
 * Hook to use the connection context
 */
export const useConnection = (): ConnectionContextProps => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
