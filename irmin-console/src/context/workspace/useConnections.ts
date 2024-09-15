'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { Connection } from '@/types/api/Connection';
import { Workspace } from '@/types/api/Workspace';

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
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
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
    locale
  );

  const deleteConnection = useDeleteConnection(
    connections,
    setConnections,
    locale
  );

  const updateConnection = useUpdateConnection(
    connections,
    setConnections,
    locale
  );

  const reassignConnection = useReassignConnection(
    connections,
    setConnections,
    locale
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
