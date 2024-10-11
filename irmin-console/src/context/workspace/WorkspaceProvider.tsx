'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { useParams } from 'next/navigation';

import { Locale } from '@/dictionaries';

import { getCookie, setCookie } from '@/utils/cookie';

import { WorkspaceContext } from './index';
import useConnections from './useConnections';
import useInvite from './useInvite';
import useRepositories from './useRepositories';
import useUsersAndRoles from './useUsersAndRoles';
import useWorkflows from './useWorkflows';
import useWorkspaces from './useWorkspaces';

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
  // URL params
  const params = useParams();

  // Workspace context state objects
  const initialisedRef = useRef(false);
  const workspaceFetchedRef = useRef<string | null>(null);
  const workspaceLoadingRef = useRef<boolean>(false);

  // Other context hooks
  const workspaces = useWorkspaces({ locale });
  const currentWorkspace = workspaces.currentWorkspace;
  const connections = useConnections({
    currentWorkspace,
    locale,
  });
  const repositories = useRepositories({
    currentWorkspace,
    locale,
  });
  const usersAndRoles = useUsersAndRoles({
    currentWorkspace,
    locale,
  });
  const invites = useInvite({
    currentWorkspace,
    locale,
  });
  const workflows = useWorkflows({
    currentWorkspace,
    locale,
  });

  /**
   * Function to update the full workspace context data.
   * @param workspace The workspace to fetch the data for.
   */
  const updateFullWorkspaceData = useCallback(
    async (workspaceSlug: string | null) => {
      // Prevent multiple simultaneous fetches
      if (workspaceLoadingRef.current) return;
      workspaceLoadingRef.current = true;
      // Set the fetched workspace slug
      workspaceFetchedRef.current = workspaceSlug;
      try {
        // Empty workspace slug = reset the context data
        if (!workspaceSlug) {
          connections.setConnections([]);
          workflows.setImports([]);
          workflows.setExports([]);
          workflows.setActions([]);
          repositories.setRepositories([]);
          usersAndRoles.setUsers([]);
          invites.setInvites([]);
          return;
        }
        // Fetch the full data for the current workspace
        const res = await workspaces.fetchFullCurrentWorkspace(workspaceSlug);
        // Set the states for the fetched data
        connections.setConnections(res.data.connections);
        workflows.setImports(res.data.imports);
        workflows.setExports(res.data.exports);
        workflows.setActions(res.data.actions);
        repositories.setRepositories(res.data.repositories);
        usersAndRoles.setUsers(res.data.users);
        invites.setInvites(res.data.invites);
      } catch (error) {
        console.error('Failed to fetch initial workspace data:', error);
      } finally {
        workspaceLoadingRef.current = false;
      }
    },
    [workspaces, connections, workflows, repositories, usersAndRoles, invites]
  );

  /**
   * Fetch and set the initial data for the workspace when the currentWorkspace changes
   */
  useEffect(() => {
    // Check if the current workspace is set
    if (!currentWorkspace) {
      // If workspace is already empty, no need to reset the workspace data
      if (!workspaceFetchedRef.current) return;
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
        await usersAndRoles.fetchRoles();
        // Check if path is provided with workspace
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (pathHasWorkspace) {
          // Attempt to switch to the workspace provided in the path
          await workspaces.switchWorkspace(params.workspace as string);
        } else {
          // Attempt to switch to the workspace stored in localStorage
          const currentWorkspaceSlug = getCookie('currentWorkspaceSlug');
          if (currentWorkspaceSlug && currentWorkspaceSlug.length > 0) {
            // Remove the workspace slug from localStorage
            setCookie('currentWorkspaceSlug', '', -1);
            // Switch to the cached workspace
            await workspaces.switchWorkspace(currentWorkspaceSlug);
          } else {
            // Set workspace to null
            await workspaces.switchWorkspace(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        // Set workspace to null
        await workspaces.switchWorkspace(null);
      }
    })();
  }, [usersAndRoles, workspaces, params]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceLoading: workspaceLoadingRef.current,
        irminRoles: usersAndRoles.irminRoles,
        workspaces,
        users: {
          users: usersAndRoles.users,
          isLoading: usersAndRoles.usersLoading,
          fetchUsers: usersAndRoles.fetchUsers,
          deleteUser: usersAndRoles.deleteUser,
          changeUserRole: usersAndRoles.changeUserRole,
        },
        invites,
        connections,
        repositories,
        workflows: {
          imports: {
            imports: workflows.imports,
            isLoading: workflows.importsLoading,
            fetchImports: workflows.fetchImports,
          },
          exports: {
            exports: workflows.exports,
            isLoading: workflows.exportsLoading,
            fetchExports: workflows.fetchExports,
          },
          actions: {
            actions: workflows.actions,
            isLoading: workflows.actionsLoading,
            fetchActions: workflows.fetchActions,
          },
          allWorkflows: workflows.allWorkflows,
          createWorkflow: workflows.createWorkflow,
          updateWorkflow: workflows.updateWorkflow,
          reassignWorkflow: workflows.reassignWorkflow,
          deleteWorkflow: workflows.deleteWorkflow,
          pauseWorkflow: workflows.pauseWorkflow,
          resumeWorkflow: workflows.resumeWorkflow,
          triggerWorkflowRun: workflows.triggerWorkflowRun,
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
