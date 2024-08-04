'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

import { Locale } from '@/dictionaries';

import { WorkspaceContext } from '@/context/workspace';
import useActions from '@/context/workspace/provider/useActions';
import useConnections from '@/context/workspace/provider/useConnections';
import useDashboards from '@/context/workspace/provider/useDashboards';
import useDataRepositories from '@/context/workspace/provider/useDataRepositories';
import useExports from '@/context/workspace/provider/useExports';
import useInvite from '@/context/workspace/provider/useInvite';
import useUsersAndRoles from '@/context/workspace/provider/useUsersAndRoles';
import useWorkflows from '@/context/workspace/provider/useWorkflows';
import useWorkspaces from '@/context/workspace/provider/useWorkspaces';

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

  // Loading state for the Workspace Context as a whole
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Workspaces
  const {
    workspaces,
    workspacesLoading,
    currentWorkspace,
    switchToWorkspace,
    deleteCurrentWorkspace,
    transferOwnership,
    fetchWorkspaces,
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
  const { dashboards, dashboardsLoading, fetchDashboards } = useDashboards({
    currentWorkspace,
    locale,
  });

  // Data repositories
  const {
    dataRepositories,
    dataRepositoriesLoading,
    fetchDataRepositories,
    createDataRepository,
    updateDataRepository,
    deleteDataRepository,
    reassignDataRepository,
  } = useDataRepositories({
    currentWorkspace,
    locale,
  });

  // Users and roles
  const {
    irminRoles,
    fetchRoles,
    users,
    usersLoading,
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
   * Hook to initialise the context by fetching initial data.
   *
   * @remarks
   *
   * This useEffect runs only once when the component is mounted.
   * It fetches workspaces and roles, and attempts to switch to the workspace stored in localStorage.
   */
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
   * Hook to fetch workspace data whenever the current workspace changes.
   */
  useEffect(() => {
    fetchDashboards();
    fetchConnections();
    fetchActions();
    fetchExports();
    fetchDataRepositories();
    fetchUsers();
    fetchInvites();
  }, [
    fetchDashboards,
    fetchConnections,
    fetchActions,
    fetchExports,
    fetchDataRepositories,
    fetchUsers,
    fetchInvites,
    currentWorkspace,
  ]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceLoading,
        irminRoles,
        workspaces: {
          workspaces,
          currentWorkspace,
          switchToWorkspace,
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
        dataRepositories: {
          dataRepositories,
          isLoading: dataRepositoriesLoading,
          fetchDataRepositories,
          createDataRepository,
          updateDataRepository,
          deleteDataRepository,
          reassignDataRepository,
        },
        workflows: {
          workflowRuns,
          workflowRunsLoading,
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
