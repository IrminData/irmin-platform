'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

import { Locale } from '@/dictionaries';

import { WorkspaceContext } from '@/context/workspace';
import useActions from '@/context/workspace/provider/useActions';
import useConnections from '@/context/workspace/provider/useConnections';
import useDashboards from '@/context/workspace/provider/useDashboards';
import useExports from '@/context/workspace/provider/useExports';
import useInvite from '@/context/workspace/provider/useInvite';
import useRepositories from '@/context/workspace/provider/useRepositories';
import useUsersAndRoles from '@/context/workspace/provider/useUsersAndRoles';
import useWorkflows from '@/context/workspace/provider/useWorkflows';
import useWorkspaces from '@/context/workspace/provider/useWorkspaces';

import { getCookie, setCookie } from '@/utils/cookie';

/**
 * Provider for the workspace context to handle workspace data.
 *
 * It fetches the workspace related data from the API, provides it to the app,
 * and provides functions to interact with the workspace data and API services.
 */
export const WorkspaceProvider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) => {
  const params = useParams();

  // Ref to check if the component has been initialised
  const initialisedRef = useRef(false);

  // Ref to check if the workspace is loading and which workspace is fetched
  const workspaceFetchedRef = useRef<string | null>(null);

  // Workspace loading state
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Workspaces
  const {
    workspaces,
    workspacesLoading,
    currentWorkspace,
    switchWorkspace,
    deleteCurrentWorkspace,
    transferOwnership,
    fetchWorkspaces,
    fetchFullCurrentWorkspace,
    createWorkspace,
    updateWorkspace,
  } = useWorkspaces({ locale });

  // Actions
  const { actions, actionsLoading, fetchActions, setActions } = useActions({
    currentWorkspace,
    locale,
  });

  // Connections
  const { connections, connectionsLoading, fetchConnections, setConnections } =
    useConnections({
      currentWorkspace,
      locale,
    });

  // Exports
  const { exports, exportsLoading, fetchExports, setExports } = useExports({
    currentWorkspace,
    locale,
  });

  // Dashboards
  const { dashboards, dashboardsLoading, setDashboards, fetchDashboards } =
    useDashboards({
      currentWorkspace,
      locale,
    });

  // Repositories
  const {
    repositories,
    dataRepositoriesLoading,
    setRepositories,
    fetchRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    reassignRepository,
  } = useRepositories({
    currentWorkspace,
    locale,
  });

  // Users and roles
  const {
    irminRoles,
    fetchRoles,
    users,
    usersLoading,
    setUsers,
    fetchUsers,
    deleteUser,
    changeUserRole,
  } = useUsersAndRoles({
    currentWorkspace,
    locale,
  });

  // Invites
  const {
    invites,
    invitesLoading,
    setInvites,
    fetchInvites,
    sendInvite,
    resendInvite,
    cancelInvite,
    changeInvite,
  } = useInvite({
    currentWorkspace,
    locale,
  });

  // Workflows and Workflow Runs (common logic for all workflow types)
  const {
    allWorkflows,
    workflowRuns,
    workflowRunsLoading,
    fetchWorkflowRuns,
    fetchWorkflowRunsByWorkflow,
    updateWorkflow,
    deleteWorkflow,
    pauseWorkflow,
    resumeWorkflow,
  } = useWorkflows({
    actions,
    setActions,
    connections,
    setConnections,
    exports,
    setExports,
    currentWorkspace,
    locale,
  });

  /**
   * Function to update the full workspace context data.
   * @param workspace The workspace to fetch the data for.
   */
  const updateFullWorkspaceData = useCallback(
    async (workspaceSlug: string | null) => {
      // Set the fetched workspace slug
      workspaceFetchedRef.current = workspaceSlug;
      // Set the loading state
      setWorkspaceLoading(true);
      // Empty workspace slug = reset the context data
      if (!workspaceSlug) {
        setDashboards([]);
        setConnections([]);
        setExports([]);
        setActions([]);
        setRepositories([]);
        setUsers([]);
        setInvites([]);
        return;
      }
      try {
        // Fetch the full data for the current workspace
        const res = await fetchFullCurrentWorkspace(workspaceSlug);
        // Set the states
        setDashboards(res.data.dashboards);
        setConnections(res.data.connections);
        setExports(res.data.exports);
        setActions(res.data.actions);
        setRepositories(res.data.repositories);
        setUsers(res.data.users);
        setInvites(res.data.invites);
      } catch (error) {
        console.error('Failed to fetch initial workspace data:', error);
      } finally {
        // Reset the loading state
        setWorkspaceLoading(false);
      }
    },
    [
      fetchFullCurrentWorkspace,
      setDashboards,
      setConnections,
      setExports,
      setActions,
      setRepositories,
      setUsers,
      setInvites,
    ]
  );

  /**
   * Fetch and set the initial data for the workspace when the currentWorkspace changes
   */
  useEffect(() => {
    // Check if the current workspace is set
    if (!currentWorkspace) {
      // Reset the workspace data
      updateFullWorkspaceData(null);
      return;
    }
    // Make sure data is fetched once per workspace
    if (workspaceFetchedRef.current === currentWorkspace.slug) return;
    // Fetch the full data for the current workspace
    updateFullWorkspaceData(currentWorkspace.slug);
  }, [updateFullWorkspaceData, currentWorkspace]);

  /**
   * Hook to initialise the context by setting the current workspace.
   *
   * This useEffect runs only once when the component is mounted.
   * Fetches roles, as they are not workspace specific.
   * Attempts to switch to the workspace to that is found in the query params or in cookies.
   */
  useEffect(() => {
    (async () => {
      try {
        // Do not initialise if the component is already initialised
        if (initialisedRef.current) return;
        initialisedRef.current = true;
        // Fetch roles
        await fetchRoles();
        // Check if path is provided with workspace
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (pathHasWorkspace) {
          // Attempt to switch to the workspace provided in the path
          await switchWorkspace(params.workspace as string);
        } else {
          // Attempt to switch to the workspace stored in localStorage
          const currentWorkspaceSlug = getCookie('currentWorkspaceSlug');
          if (currentWorkspaceSlug && currentWorkspaceSlug.length > 0) {
            // Remove the workspace slug from localStorage
            setCookie('currentWorkspaceSlug', '', -1);
            // Switch to the cached workspace
            await switchWorkspace(currentWorkspaceSlug);
          } else {
            // Set workspace to null
            await switchWorkspace(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        // Set workspace to null
        await switchWorkspace(null);
      }
    })();
  }, [fetchRoles, switchWorkspace, params]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceLoading,
        irminRoles,
        workspaces: {
          workspaces,
          currentWorkspace,
          switchWorkspace,
          deleteCurrentWorkspace,
          transferOwnership,
          fetchWorkspaces,
          workspacesLoading,
          createWorkspace,
          updateWorkspace,
        },
        users: {
          users,
          isLoading: usersLoading,
          fetchUsers,
          deleteUser,
          changeUserRole,
        },
        invites: {
          invites,
          isLoading: invitesLoading,
          fetchInvites,
          sendInvite,
          resendInvite,
          cancelInvite,
          changeInvite,
        },
        dashboards: {
          dashboards,
          isLoading: dashboardsLoading,
          fetchDashboards,
        },
        connections: {
          connections,
          isLoading: connectionsLoading,
          fetchConnections,
        },
        exports: {
          exports,
          isLoading: exportsLoading,
          fetchExports,
        },
        actions: {
          actions,
          isLoading: actionsLoading,
          fetchActions,
        },
        repositories: {
          repositories,
          isLoading: dataRepositoriesLoading,
          fetchRepositories,
          createRepository,
          updateRepository,
          deleteRepository,
          reassignRepository,
        },
        workflows: {
          workflowRuns,
          workflowRunsLoading,
          allWorkflows,
          fetchWorkflowRuns,
          fetchWorkflowRunsByWorkflow,
          updateWorkflow,
          deleteWorkflow,
          pauseWorkflow,
          resumeWorkflow,
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
