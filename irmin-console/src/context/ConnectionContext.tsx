'use client';

import { createContext, useContext, useMemo } from 'react';

import { Connection } from '@/types/core/Connection';

import { useWorkspace } from './workspace';

/**
 * Connection context properties
 */
interface ConnectionContextProps {
  // Active connection context state
  connection: Connection;
}

const ConnectionContext = createContext<ConnectionContextProps | undefined>(
  undefined
);

/**
 * Connection context for state management and interactions with connections of the workspace
 *
 * @param config - Connection context provider configuration
 * @param config.children - Child components
 * @param config.connectionID - Connection ID
 *
 * @returns Connection context provider
 */
export const ConnectionProvider = ({
  children,
  connectionID,
}: {
  children: React.ReactNode;
  connectionID: string;
}) => {
  const {
    connections: { connections },
  } = useWorkspace();

  // Active Connection for the context
  const connection = useMemo(
    () => connections.find((item) => item.id === connectionID),
    [connections, connectionID]
  );

  // Return nothing until the connection is set
  if (!connection) return <></>;

  return (
    <ConnectionContext.Provider
      value={{
        connection,
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
