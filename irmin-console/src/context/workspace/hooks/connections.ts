'use client';

import { useCallback } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { Connection } from '@/types/core/Connection';
import { User } from '@/types/core/User';
import { Workspace } from '@/types/core/Workspace';

/**
 * Hook to fetch and update context for Connections of the current workspace using the {@link IrminCore}.
 */
export const useFetchConnections = (
  currentWorkspace: Workspace | null,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Prevent multiple simultaneous fetches
      if (loading) return;
      setLoading(true);
      try {
        // Get the workflow service
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setConnections([]);
          return;
        }
        // Fetch the connections for the current workspace
        const res = await irminCore.connectionService.fetchConnections();
        setConnections(res.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setConnections,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      irminCore,
    ]
  );

/**
 * Hook to update a Connection using the {@link IrminCore}.
 */
export const useUpdateConnection = (
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (connection: string, updatedConnection: Connection) => {
      // Update the connection
      const res = await irminCore.connectionService.updateConnection(
        connection,
        updatedConnection
      );
      // Update the local state with the updated connection
      const updateConnections = connections.map((conn) =>
        conn.id === connection ? { ...conn, ...updatedConnection } : conn
      );
      setConnections(updateConnections);
      // Return the res from the API
      return res;
    },
    [connections, setConnections, irminCore]
  );

/**
 * Hook to delete a Connection using the {@link IrminCore}.
 */
export const useDeleteConnection = (
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (connection: string) => {
      // Delete the connection
      const res =
        await irminCore.connectionService.deleteConnection(connection);
      // Update the local state by removing the deleted connection
      const updateConnections = connections.filter(
        (conn) => conn.id !== connection
      );
      setConnections(updateConnections);
      // Return the res from the API
      return res;
    },
    [connections, setConnections, irminCore]
  );

/**
 * Hook to reassign a Connection to a new owner using the {@link IrminCore}.
 */
export const useReassignConnection = (
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (connection: string, newOwner: User) => {
      // Reassign the connection
      const res = await irminCore.connectionService.reassignConnection(
        connection,
        newOwner
      );
      // Update the local state by changing the owner prop to the new owner
      const updateConnections = connections.map((conn) =>
        conn.id === connection ? { ...conn, owner: newOwner } : conn
      );
      setConnections(updateConnections);
      // Return the res from the API
      return res;
    },
    [connections, setConnections, irminCore]
  );
