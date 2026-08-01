'use client';

import { createContext, useContext } from 'react';

import { useConnection } from '@/hooks/api';

/**
 * Connection context properties
 */
interface ConnectionContextProps extends ReturnType<typeof useConnection> {
  connectionID: string;
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
}: {
  children: React.ReactNode;
  connectionID: string;
}) => {
  const connection = useConnection(connectionID);

  return (
    <ConnectionContext.Provider
      value={{
        connectionID,
        ...connection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

/**
 * Hook to use the connection context
 */
export const useConnectionContext = (): ConnectionContextProps => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error(
      'useConnectionContext must be used within a ConnectionProvider'
    );
  }
  return context;
};
