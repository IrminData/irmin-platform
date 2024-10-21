'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import {
  deleteConnection,
  getConnection,
  reassignConnection,
  updateConnection,
} from '@/lib/actions/connections';

import { Connection } from '@/types/core/Connection';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

import { useLocale } from './LocaleContext';
import { usePopup } from './PopupContext';

/**
 * Connection context properties
 */
interface ConnectionContextProps {
  connection: Connection;
  fetchConnection: () => Promise<void>;
  deleteConnection: () => Promise<void>;
  updateConnection: (data: ItemUpdateProps) => Promise<void>;
  reassignConnection: (ownerID: string) => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextProps | undefined>(
  undefined
);

/**
 * Connection context for state management and interactions with one of the connections in the workspace
 */
export const ConnectionProvider = ({
  children,
  connectionID,
  defaultConnection,
}: {
  children: React.ReactNode;
  connectionID: string;
  defaultConnection: Connection;
}) => {
  const { dict } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();

  // Track if the connection is being updated
  const updating = useRef(false);

  // Active Connection for the context
  const [connection, setConnection] = useState(defaultConnection);

  const fetchConnection = useCallback(async () => {
    try {
      const newConnection = await getConnection(connectionID);
      setConnection(newConnection);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the connection'
      );
    }
  }, [connectionID, irminAlert]);

  const handleDeleteConnection = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.misc.areYouSureYouWantToDelete} (${connection.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const res = await deleteConnection(connection.id);
      irminAlert('success', res.message ?? 'Connection deleted successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the connection'
      );
    } finally {
      updating.current = false;
    }
  }, [connection, dict, irminAlert, irminConfirm]);

  const handleUpdateConnection = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const res = await updateConnection(connection.id, data);
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
    [connection, fetchConnection, irminAlert]
  );

  const handleReassignConnection = useCallback(
    async (ownerID: string) => {
      const confirmed = await irminConfirm(
        'warning',
        `${dict.misc.areYouSureYouWantToReassign} (${connection.name})`
      );
      if (updating.current || !confirmed) return;
      try {
        updating.current = true;
        const res = await reassignConnection(connection.id, ownerID);
        await fetchConnection();
        irminAlert(
          'success',
          res.message ?? 'Connection reassigned successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error reassigning the connection'
        );
      } finally {
        updating.current = false;
      }
    },
    [connection, dict, fetchConnection, irminAlert, irminConfirm]
  );

  return (
    <ConnectionContext.Provider
      value={{
        connection,
        fetchConnection,
        deleteConnection: handleDeleteConnection,
        updateConnection: handleUpdateConnection,
        reassignConnection: handleReassignConnection,
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
