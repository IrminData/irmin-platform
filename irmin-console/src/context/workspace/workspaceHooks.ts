'use client';

import { useCallback } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import WorkspaceService from '@/lib/api/WorkspaceService';
import {
  offlineConnections,
  offlineRoles,
  offlineWorkspace,
} from '@/lib/offlineObjects';

import { ConnectionWithAdditionalData } from '@/types/Connection';
import { IrminRole, Workspace } from '@/types/Workspace';

/**
 * Hook to fetch the list of workspaces.
 * It will fetch from the API if not in offline mode.
 * @param setWorkspaces - Function to update the workspaces state.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous fetches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 */
export const useFetchWorkspaces = (
  workspaces: Workspace[] | null,
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[] | null>>,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>
) =>
  useCallback(async () => {
    // Get the workspace service
    const workspaceService = WorkspaceService.getInstance();
    // Prevent multiple simultaneous fetches
    if (workspaceLoading) return;
    // Handle offline mode
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      setWorkspaces([offlineWorkspace]);
      setCurrentWorkspace(offlineWorkspace);
      return;
    }
    // Fetch the workspaces
    try {
      setWorkspaceLoading(true);
      const data = await workspaceService.getWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : null);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      throw error;
    } finally {
      setWorkspaceLoading(false);
    }
  }, [
    setCurrentWorkspace,
    setWorkspaces,
    workspaceLoading,
    setWorkspaceLoading,
  ]);

/**
 * Hook to fetch the list of roles.
 * It will fetch from the API if not in offline mode.
 * @param irminRoles - The current roles state.
 * @param setIrminRoles - Function to update the roles state.
 */
export const useFetchRoles = (
  irminRoles: IrminRole[],
  setIrminRoles: React.Dispatch<React.SetStateAction<IrminRole[]>>
) =>
  useCallback(async () => {
    // Check if the roles are already fetched
    if (irminRoles.length > 0) return;
    // Get the workspace service
    const workspaceService = WorkspaceService.getInstance();
    // Get the offline mode from the environment variable
    const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
    if (offlineMode) {
      setIrminRoles(offlineRoles);
      return;
    }
    // Fetch the roles
    try {
      const data = await workspaceService.getIrminRoles();
      setIrminRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setIrminRoles([]);
      throw error;
    }
  }, [irminRoles, setIrminRoles]);

/**
 * Hook to fetch the list of connections for the current workspace.
 * It will fetch from the API if not in offline mode.
 * @param currentWorkspace - The current workspace to fetch connections for.
 * @param setConnections - Function to update the connections state.
 */
export const useFetchConnections = (
  currentWorkspace: Workspace | null,
  setConnections: React.Dispatch<
    React.SetStateAction<ConnectionWithAdditionalData[]>
  >,
  connectionsLoading: boolean,
  setConnectionsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  connectionsFetchedFor: string | null,
  setConnectionsFetchedFor: React.Dispatch<React.SetStateAction<string | null>>
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!connectionsFetchedFor && !currentWorkspace) return;
        if (connectionsFetchedFor === currentWorkspace?.slug) return;
      }
      setConnectionsFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workspaceService = WorkspaceService.getInstance();
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setConnections([]);
        return;
      }
      // Get the offline mode from the environment variable
      const offlineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
      if (offlineMode) {
        setConnections(offlineConnections);
        setConnectionsLoading(false);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (connectionsLoading) return;
        setConnectionsLoading(true);
        // Fetch the connections for the current workspace
        const res = await workspaceService.fetchConnectionsForWorkspace(
          currentWorkspace.slug
        );
        // Set the connections
        const newConnections: ConnectionWithAdditionalData[] = res.data.map(
          (conn) => {
            // Get random offline connections to simulate the data not yet provided by the API
            const randomOfflineConection =
              offlineConnections[
                Math.floor(Math.random() * offlineConnections.length)
              ];
            // Return the connection with the offline data
            return {
              ...randomOfflineConection,
              ...conn,
            };
          }
        );
        setConnections(newConnections);
      } finally {
        setConnectionsLoading(false);
      }
    },
    [
      currentWorkspace,
      setConnections,
      connectionsLoading,
      setConnectionsLoading,
      connectionsFetchedFor,
      setConnectionsFetchedFor,
    ]
  );

/**
 * Hook to switch to a workspace.
 * It updates localStorage and the current workspace state, fetches the new workspace data,
 * calls API /switch endpoint, redirects to the new workspace, and shows a success or error popup message.
 * @param currentWorkspace - The current workspace to switch from.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous switches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 */
export const useSwitchWorkspace = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchWorkspaces: () => void
) => {
  const workspaceService = WorkspaceService.getInstance();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  return useCallback(
    async (workspaceSlug: string | null) => {
      try {
        // Prevent multiple simultaneous switches
        if (workspaceLoading) return;
        setWorkspaceLoading(true);
        // Check if the workspace slug is the same as the current workspace from the url
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (
          (pathHasWorkspace && params.workspace === workspaceSlug) ||
          (!workspaceSlug && !pathHasWorkspace)
        ) {
          // Check if the workspace is already fetched and set as the current workspace
          if (currentWorkspace && currentWorkspace.slug === workspaceSlug) {
            // The workspace is already the current workspace, return
            return;
          }
        }
        // If the workspace slug is not provided, reset the current workspace
        if (!workspaceSlug) {
          // Remove the current workspace from the local storage and state
          localStorage.removeItem('currentWorkspaceSlug');
          // Clear the current workspace
          setCurrentWorkspace(null);
          // Make sure the user is not on a workspace page eg. /app/{workspace-slug}/*
          if (pathname.includes('/app/')) {
            router.push('/app');
          }
          // Refetch workspace list
          await fetchWorkspaces();
        } else {
          // Switch to the new workspace
          const newWorkspace =
            await workspaceService.switchWorkspace(workspaceSlug);
          if (newWorkspace) {
            localStorage.setItem('currentWorkspaceSlug', workspaceSlug);
            setCurrentWorkspace(newWorkspace);
            // If router not already on a workspace page, redirect to the dashboards page
            if (!pathname.includes(`/app/${workspaceSlug}`)) {
              router.push(`/app/${workspaceSlug}/dashboards`);
            }
          } else {
            throw new Error('Switching workspace failed');
          }
        }
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [
      router,
      pathname,
      setCurrentWorkspace,
      fetchWorkspaces,
      workspaceLoading,
      setWorkspaceLoading,
      workspaceService,
      params,
      currentWorkspace,
    ]
  );
};

/**
 * Hook to delete a workspace.
 * It deletes the workspace using the workspace service, updates the list of workspaces,
 * and resets the current workspace to null.
 * @param currentWorkspace - The current workspace to delete.
 * @param switchToWorkspace - Function to switch to a workspace.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 */
export const useDeleteCurrentWorkspace = (
  currentWorkspace: Workspace | null,
  switchToWorkspace: (
    _workspaceSlug: string | null,
    _disableAlerts?: boolean
  ) => void,
  fetchWorkspaces: () => void
) => {
  const workspaceService = WorkspaceService.getInstance();
  return useCallback(async () => {
    if (!currentWorkspace) return;
    await workspaceService.deleteWorkspace(currentWorkspace.slug);
    await switchToWorkspace(null, true);
    await fetchWorkspaces();
  }, [currentWorkspace, switchToWorkspace, fetchWorkspaces, workspaceService]);
};
