'use client';

import { useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { Connection } from '@/types/core/Connection';
import { Workspace } from '@/types/core/Workspace';

import {
  useDeleteConnection,
  useFetchConnections,
  useReassignConnection,
  useUpdateConnection,
} from './hooks/connections';

/**
 * Hook for Connections to be used in the Workspace Provider
 */
const useConnections = ({
  currentWorkspace,
  irminCore,
}: {
  currentWorkspace: Workspace | null;
  irminCore: IrminCore;
}) => {
  // Connections
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionsFetchedFor, setConnectionsFetchedFor] = useState<
    string | null
  >(null);

  const fetchConnections = useFetchConnections(
    currentWorkspace,
    setConnections,
    loading,
    setLoading,
    connectionsFetchedFor,
    setConnectionsFetchedFor,
    irminCore
  );

  const deleteConnection = useDeleteConnection(
    connections,
    setConnections,
    irminCore
  );

  const updateConnection = useUpdateConnection(
    connections,
    setConnections,
    irminCore
  );

  const reassignConnection = useReassignConnection(
    connections,
    setConnections,
    irminCore
  );

  return {
    connections,
    isLoading: loading,
    fetchConnections,
    deleteConnection,
    updateConnection,
    reassignConnection,
    setConnections,
  };
};

export default useConnections;
