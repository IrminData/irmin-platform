'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { Connection } from '@/types/api/Connection';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

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
  locale: Locale
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
        const { connectionService } = new IrminCore(locale);
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setConnections([]);
          return;
        }
        // Fetch the connections for the current workspace
        const response = await connectionService.fetchConnections();
        setConnections(response.data);
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
      locale,
    ]
  );

/**
 * Hook to update a Connection using the {@link IrminCore}.
 */
export const useUpdateConnection = (
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  locale: Locale
) =>
  useCallback(
    async (connectionID: number, updatedConnection: Connection) => {
      // Update the connection
      const { connectionService } = new IrminCore(locale);
      const response = await connectionService.updateConnection(
        connectionID,
        updatedConnection
      );
      // Update the local state with the updated connection
      const updateConnections = connections.map((conn) =>
        conn.id === connectionID ? { ...conn, ...updatedConnection } : conn
      );
      setConnections(updateConnections);
      // Return the response from the API
      return response;
    },
    [connections, setConnections, locale]
  );

/**
 * Hook to delete a Connection using the {@link IrminCore}.
 */
export const useDeleteConnection = (
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  locale: Locale
) =>
  useCallback(
    async (connectionID: number) => {
      // Delete the connection
      const { connectionService } = new IrminCore(locale);
      const response = await connectionService.deleteConnection(connectionID);
      // Update the local state by removing the deleted connection
      const updateConnections = connections.filter(
        (conn) => conn.id !== connectionID
      );
      setConnections(updateConnections);
      // Return the response from the API
      return response;
    },
    [connections, setConnections, locale]
  );

/**
 * Hook to reassign a Connection to a new owner using the {@link IrminCore}.
 */
export const useReassignConnection = (
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  locale: Locale
) =>
  useCallback(
    async (connectionID: number, newOwner: WorkspaceUser) => {
      // Reassign the connection
      const { connectionService } = new IrminCore(locale);
      const response = await connectionService.reassignConnection(
        connectionID,
        newOwner
      );
      // Update the local state by changing the owner prop to the new owner
      const updateConnections = connections.map((conn) =>
        conn.id === connectionID ? { ...conn, owner: newOwner } : conn
      );
      setConnections(updateConnections);
      // Return the response from the API
      return response;
    },
    [connections, setConnections, locale]
  );
