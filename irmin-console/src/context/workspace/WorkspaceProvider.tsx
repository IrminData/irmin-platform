'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

import { useLocale } from '@/context/LocaleContext';
import {
  useCancelInvite,
  useChangeInvite,
  useChangeUserRole,
  useDeleteCurrentWorkspace,
  useDeleteUser,
  useFetchActions,
  useFetchConnections,
  useFetchDashboards,
  useFetchDatasets,
  useFetchExports,
  useFetchInvites,
  useFetchRoles,
  useFetchUsers,
  useFetchWorkspaces,
  useResendInvite,
  useSendInvite,
  useSwitchWorkspace,
  useTransferOwnership,
  WorkspaceContext,
} from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';
import { Dataset } from '@/types/api/Dataset';
import { Invite } from '@/types/api/Invite';
import { IrminRole } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Workspace context provider
 *
 * @remarks
 *
 * Provider for the workspace context to handle workspace data.
 * It fetches the workspace data from the API and provides it to the app.
 *
 * The workspace data includes:
 *  workspaces - list of available workspaces
 *  current workspace - the currently selected workspace
 *  roles - list of all available roles on Irmin
 *  dashboards - list of workspace's existing dashboards
 *  connections - list of workspace's existing connections
 *  exports - list of workspace's existing export processes
 *  actions - list of workspace's existing actions
 *  datasets - list of workspace's existing datasets
 *
 * It also provides methods to switch workspaces and delete the current workspace.
 */
export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { locale } = useLocale();
  const params = useParams();

  // Ref to check if the component has been initialised
  const initialisedRef = useRef(false);

  // Roles
  const [irminRoles, setIrminRoles] = useState<IrminRole[]>([]);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Connections
  const [connections, setConnections] = useState<ConnectionWorkflow[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsFetchedFor, setConnectionsFetchedFor] = useState<
    string | null
  >(null);

  // Exports
  const [exports, setExports] = useState<ExportWorkflow[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [exportsFetchedFor, setExportsFetchedFor] = useState<string | null>(
    null
  );

  // Actions
  const [actions, setActions] = useState<ActionWorkflow[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsFetchedFor, setActionsFetchedFor] = useState<string | null>(
    null
  );

  // Datasets
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsFetchedFor, setDatasetsFetchedFor] = useState<string | null>(
    null
  );

  // Dashboards
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dashboardsLoading, setDashboardsLoading] = useState(false);
  const [dashboardsFetchedFor, setDashboardsFetchedFor] = useState<
    string | null
  >(null);

  // Users
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFetchedFor, setUsersFetchedFor] = useState<string | null>(null);

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesFetchedFor, setInvitesFetchedFor] = useState<string | null>(
    null
  );

  /**
   * Hook to fetch the list of workspaces.
   * It will be run during the initialisation to load all available workspaces.
   */
  const fetchWorkspaces = useFetchWorkspaces(
    setWorkspaces,
    workspaceLoading,
    setWorkspaceLoading,
    locale
  );

  /**
   * Hook to fetch the list of roles.
   * It will be run during the initialisation to load all available roles.
   */
  const fetchRoles = useFetchRoles(setIrminRoles, locale);

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
   * Hook to fetch the list of exports for the current workspace.
   * It will be run whenever the current workspace changes to update the exports.
   */
  const fetchExports = useFetchExports(
    currentWorkspace,
    setExports,
    exportsLoading,
    setExportsLoading,
    exportsFetchedFor,
    setExportsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of actions for the current workspace.
   * It will be run whenever the current workspace changes to update the actions.
   */
  const fetchActions = useFetchActions(
    currentWorkspace,
    setActions,
    actionsLoading,
    setActionsLoading,
    actionsFetchedFor,
    setActionsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of datasets for the current workspace.
   * It will be run whenever the current workspace changes to update the datasets.
   */
  const fetchDatasets = useFetchDatasets(
    currentWorkspace,
    setDatasets,
    datasetsLoading,
    setDatasetsLoading,
    datasetsFetchedFor,
    setDatasetsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of dashboards for the current workspace.
   * It will be run whenever the current workspace changes to update the dashboards.
   */
  const fetchDashboards = useFetchDashboards(
    currentWorkspace,
    setDashboards,
    dashboardsLoading,
    setDashboardsLoading,
    dashboardsFetchedFor,
    setDashboardsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of users for the current workspace.
   * It will be run whenever the current workspace changes to update the users.
   */
  const fetchUsers = useFetchUsers(
    currentWorkspace,
    setUsers,
    usersLoading,
    setUsersLoading,
    usersFetchedFor,
    setUsersFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of invites for the current workspace.
   * It will be run whenever the current workspace changes to update the invites.
   */
  const fetchInvites = useFetchInvites(
    currentWorkspace,
    setInvites,
    invitesLoading,
    setInvitesLoading,
    invitesFetchedFor,
    setInvitesFetchedFor,
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
   * Hook to transfer ownership of the current workspace. It calls the API to transfer ownership,
   * and refetches the current workspace.
   */
  const transferOwnership = useTransferOwnership(
    currentWorkspace,
    setCurrentWorkspace,
    locale
  );

  /**
   * Hook to send an invite to a user. It calls the API to send the invite,
   * and fetches the updated list of invites.
   */
  const sendInvite = useSendInvite(currentWorkspace, setInvites, locale);

  /**
   * Hook to resend an invite to a user. It calls the API to resend the invite,
   * and fetches the updated list of invites.
   */
  const resendInvite = useResendInvite(locale);

  /**
   * Hook to cancel an invite to a user. It calls the API to cancel the invite,
   * and fetches the updated list of invites.
   */
  const cancelInvite = useCancelInvite(invites, setInvites, locale);

  /**
   * Hook to change an invite to a user. It calls the API to change the invite,
   * and fetches the updated list of invites.
   */
  const changeInvite = useChangeInvite(invites, setInvites, locale);

  /**
   * Hook to delete a user. It calls the API to delete the user,
   * and fetches the updated list of users.
   */
  const deleteUser = useDeleteUser(users, setUsers, locale);

  /**
   * Hook to change the role of a user. It calls the API to change the role,
   * and fetches the updated list of users.
   */
  const changeUserRole = useChangeUserRole(users, setUsers, locale);

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
   * useEffect hook to fetch workspace data whenever the current workspace changes.
   */
  useEffect(() => {
    fetchDashboards();
    fetchConnections();
    fetchActions();
    fetchExports();
    fetchDatasets();
    fetchUsers();
    fetchInvites();
  }, [
    fetchDashboards,
    fetchConnections,
    fetchActions,
    fetchExports,
    fetchDatasets,
    fetchUsers,
    fetchInvites,
    currentWorkspace,
  ]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        workspaceLoading,
        currentWorkspace,
        switchToWorkspace,
        deleteCurrentWorkspace,
        transferOwnership,
        fetchWorkspaces,
        irminRoles,
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
        datasets: {
          datasets,
          isLoading: datasetsLoading,
          fetchDatasets,
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
