'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useFetchConnections } from '@/context/workspace';

import { ConnectionWorkflow } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for connections to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useConnections = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Connections
  const [connections, setConnections] = useState<ConnectionWorkflow[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsFetchedFor, setConnectionsFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the connections for the current workspace.
   * It will be run whenever the current workspace changes to update the connections.
   */
  const fetchConnections = useFetchConnections(
    currentWorkspace,
    setConnections,
    connectionsLoading,
    setConnectionsLoading,
    connectionsFetchedFor,
    setConnectionsFetchedFor,
    locale
  );

  return {
    connections,
    connectionsLoading,
    fetchConnections,
  };
};

export default useConnections;
