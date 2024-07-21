'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

import { useLocale } from '@/context/LocaleContext';
import {
  useDeleteCurrentWorkspace,
  useFetchConnections,
  useFetchRoles,
  useFetchWorkspaces,
  useSwitchWorkspace,
  WorkspaceContext,
} from '@/context/workspace';

import { ConnectionWithAdditionalData } from '@/types/Connection';
import { IrminRole, Workspace } from '@/types/Workspace';

export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { locale } = useLocale();
  const params = useParams();

  // Workspaces
  const [irminRoles, setIrminRoles] = useState<IrminRole[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Connections
  const [connections, setConnections] = useState<
    ConnectionWithAdditionalData[]
  >([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsFetchedFor, setConnectionsFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the list of workspaces.
   * It will be run during the initialisation to load all available workspaces.
   */
  const fetchWorkspaces = useFetchWorkspaces(
    setWorkspaces,
    setCurrentWorkspace,
    workspaceLoading,
    setWorkspaceLoading,
    locale
  );

  /**
   * Hook to fetch the list of roles.
   * It will be run during the initialisation to load all available roles.
   */
  const fetchRoles = useFetchRoles(irminRoles, setIrminRoles, locale);

  /**
   * Hook to fetch the list of connections for the current workspace.
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

  /**
   * Hook to switch to a workspace. Updates localStorage and the current workspace state.
   * Fetches the new workspace data, calls API /switch endpoint, redirects to the new workspace,
   * and shows a success or error popup message.
   * @param workspaceSlug - The slug of the workspace to switch to.
   */
  const switchToWorkspace = useSwitchWorkspace(
    currentWorkspace,
    setCurrentWorkspace,
    workspaceLoading,
    setWorkspaceLoading,
    fetchWorkspaces,
    locale
  );

  /**
   * Hook to delete the current workspace. It calls the API to delete the workspace,
   * switches to the default workspace, and fetches the updated list of workspaces.
   */
  const deleteCurrentWorkspace = useDeleteCurrentWorkspace(
    switchToWorkspace,
    fetchWorkspaces,
    locale
  );

  /**
   * useEffect hook to initialise the context by fetching initial data.
   * This effect runs only once when the component is mounted.
   * It fetches workspaces and roles, and attempts to switch to the workspace stored in localStorage.
   */
  const initialisedRef = useRef(false);
  useEffect(() => {
    const initialise = async () => {
      if (initialisedRef.current) return;
      initialisedRef.current = true;

      try {
        setWorkspaceLoading(true);
        // Fetch workspaces and roles
        await fetchRoles();
        await fetchWorkspaces();
        // Check if path is provided with workspace
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (pathHasWorkspace) {
          // Attempt to switch to the workspace provided in the path
          await switchToWorkspace(params.workspace as string);
        } else {
          // Attempt to switch to the workspace stored in localStorage
          const currentWorkspaceSlug = localStorage.getItem(
            'currentWorkspaceSlug'
          );
          if (currentWorkspaceSlug && currentWorkspaceSlug.length > 0) {
            // Remove the workspace slug from localStorage
            localStorage.removeItem('currentWorkspaceSlug');
            // Switch to the cached workspace
            await switchToWorkspace(currentWorkspaceSlug);
          } else {
            // Set workspace to null
            await switchToWorkspace(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        // Set workspace to null
        await switchToWorkspace(null);
      } finally {
        setWorkspaceLoading(false);
      }
    };

    initialise();
  }, [fetchWorkspaces, fetchRoles, switchToWorkspace, params]);

  /**
   * useEffect hook to fetch connections whenever the current workspace changes.
   */
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections, currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        workspaceLoading,
        currentWorkspace,
        switchToWorkspace,
        deleteCurrentWorkspace: deleteCurrentWorkspace,
        fetchWorkspaces,
        irminRoles,
        connections: {
          connections,
          isLoading: connectionsLoading,
          fetchConnections,
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
