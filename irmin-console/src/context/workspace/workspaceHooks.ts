'use client';

import { useCallback } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { Locale } from '@/dictionaries';
import DashboardService from '@/lib/api/DashboardService';
import DatasetService from '@/lib/api/DatasetService';
import InviteService from '@/lib/api/InviteService';
import UserAndRoleService from '@/lib/api/UserAndRoleService';
import WorkflowService from '@/lib/api/WorkflowService';
import WorkspaceService from '@/lib/api/WorkspaceService';

import { Dashboard } from '@/types/api/Dashboard';
import { Dataset } from '@/types/api/Dataset';
import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { WorkspaceUser } from '@/types/api/Workspace';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of workspaces.
 *
 * @param setWorkspaces - Function to update the workspaces state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous fetches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param locale - The current locale.
 */
export const useFetchWorkspaces = (
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  locale: Locale
) =>
  useCallback(async () => {
    // Get the workspace service
    const workspaceService = WorkspaceService.getInstance(locale);
    // Prevent multiple simultaneous fetches
    if (workspaceLoading) return;
    // Fetch the workspaces
    try {
      setWorkspaceLoading(true);
      const data = await workspaceService.fetchWorkspaces();
      setWorkspaces(data.data ?? []);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      throw error;
    } finally {
      setWorkspaceLoading(false);
    }
  }, [setWorkspaces, workspaceLoading, setWorkspaceLoading, locale]);

/**
 * Hook to fetch the list of roles available on Irmin.
 *
 * @param setIrminRoles - Function to update the roles state.
 * @param locale - The current locale.
 */
export const useFetchRoles = (
  setIrminRoles: React.Dispatch<React.SetStateAction<IrminRole[]>>,
  locale: Locale
) =>
  useCallback(async () => {
    // Get the workspace service
    const rolesService = UserAndRoleService.getInstance(locale);
    // Fetch the roles
    try {
      const savedRoles = await rolesService.getRoles();
      if (savedRoles && savedRoles.length > 0) {
        setIrminRoles(savedRoles);
      } else {
        const data = await rolesService.fetchRoles();
        setIrminRoles(data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setIrminRoles([]);
      throw error;
    }
  }, [setIrminRoles, locale]);

/**
 * Hook to fetch the list of connection workflows for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setConnections - Function to update the connections state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchConnections = (
  currentWorkspace: Workspace | null,
  setConnections: React.Dispatch<React.SetStateAction<ConnectionWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for connections of the current workspace.
     * @param forceFetch - Whether to force fetch. Force fetch will fetch the even if the data is already fetched.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workflowService = WorkflowService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setConnections([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await workflowService.fetchConnections();
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
 * Hook to fetch the list of export workflows for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setExports - Function to update the exports state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchExports = (
  currentWorkspace: Workspace | null,
  setExports: React.Dispatch<React.SetStateAction<ExportWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for exports of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workflowService = WorkflowService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setExports([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await workflowService.fetchExports();
        setExports(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setExports,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of actions workflows for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setActions - Function to update the actions state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchActions = (
  currentWorkspace: Workspace | null,
  setActions: React.Dispatch<React.SetStateAction<ActionWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for actions of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workflowService = WorkflowService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setActions([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await workflowService.fetchActions();
        setActions(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setActions,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of Datasets for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setDatasets - Function to update the datasets state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDatasets = (
  currentWorkspace: Workspace | null,
  setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for datasets of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const datasetService = DatasetService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setDatasets([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await datasetService.fetchAllDatasets();
        setDatasets(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setDatasets,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of dashboards for the current workspace.
 * @param currentWorkspace - The current workspace
 * @param setDashboards - Function to update the dashboards state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace dashboards are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDashboards = (
  currentWorkspace: Workspace | null,
  setDashboards: React.Dispatch<React.SetStateAction<Dashboard[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for dashboards of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const dashboardService = DashboardService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setDashboards([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await dashboardService.fetchDashboards();
        setDashboards(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setDashboards,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of users for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setUsers - Function to update the users state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace dashboards are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchUsers = (
  currentWorkspace: Workspace | null,
  setUsers: React.Dispatch<React.SetStateAction<WorkspaceUser[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for users of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const userService = UserAndRoleService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setUsers([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the data
        const response = await userService.fetchAllUsers();
        setUsers(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setUsers,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of invites for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setInvites - Function to update the invites state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace dashboards are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchInvites = (
  currentWorkspace: Workspace | null,
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for invites of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const inviteService = InviteService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setInvites([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the data
        const response = await inviteService.getInvitesByWorkspace(
          currentWorkspace.slug
        );
        setInvites(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setInvites,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to switch to a workspace.
 *
 * @remarks
 *
 * It updates localStorage and the current workspace state, fetches the new workspace data,
 * calls API /switch endpoint, redirects to the new workspace, and shows a success or error popup message.
 *
 * @param currentWorkspace - The current workspace to switch from.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous switches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 */
export const useSwitchWorkspace = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchWorkspaces: () => void,
  locale: Locale
) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  return useCallback(
    async (workspaceSlug: string | null) => {
      try {
        // Get the workspace service
        const workspaceService = WorkspaceService.getInstance(locale);
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
          // Make sure the user is not on a workspace page eg. /portal/{workspace-slug}/*
          if (
            pathname.includes('/portal/') &&
            !pathname.includes('/portal/profile')
          ) {
            router.push('/portal');
          }
          // Refetch workspace list
          await fetchWorkspaces();
        } else {
          // Switch to the new workspace
          const newWorkspace =
            await workspaceService.switchWorkspace(workspaceSlug);
          if (newWorkspace) {
            setCurrentWorkspace(newWorkspace.data);
            // If router not already on a workspace page, redirect to the dashboards page
            if (!pathname.includes(`/portal/${workspaceSlug}`)) {
              router.push(`/portal/${workspaceSlug}/dashboards`);
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
      currentWorkspace,
      setCurrentWorkspace,
      workspaceLoading,
      setWorkspaceLoading,
      fetchWorkspaces,
      locale,
      router,
      pathname,
      params,
    ]
  );
};

/**
 * Hook to transfer ownership of a workspace.
 *
 * @param currentWorkspace - The current workspace.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param locale - The current locale.
 *
 * @remarks
 *
 * It transfers the ownership of the workspace using the workspace service and updates the current workspace owner.
 * It also updates the currentWorkspace context state with the new owner.
 */
export const useTransferOwnership = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * @param newOwner - The ID of the new owner.
     * @returns Irmin API response.
     */
    async (newOwner: number): Promise<IrminAPIResponse> => {
      // Get the workspace service
      const workspaceService = WorkspaceService.getInstance(locale);
      // Transfer ownership
      const response =
        await workspaceService.transferWorkspaceOwnership(newOwner);
      // Update the current workspace owner
      if (currentWorkspace) {
        setCurrentWorkspace({ ...currentWorkspace, owner_id: newOwner });
      }

      return response;
    },
    [currentWorkspace, setCurrentWorkspace, locale]
  );

/**
 * Hook to delete a workspace.
 *
 * @param switchToWorkspace - Function to switch to a workspace.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 *
 * @remarks
 *
 * It deletes the workspace using the workspace service, updates the list of workspaces,
 * and resets the current workspace to null.
 */
export const useDeleteCurrentWorkspace = (
  switchToWorkspace: (
    _workspaceSlug: string | null,
    _disableAlerts?: boolean
  ) => void,
  fetchWorkspaces: () => void,
  locale: Locale
) =>
  useCallback(
    /**
     * Delete the current workspace and update the context state.
     * @returns Irmin API response.
     */
    async (): Promise<IrminAPIResponse> => {
      const workspaceService = WorkspaceService.getInstance(locale);
      const response = await workspaceService.deleteWorkspace();
      await switchToWorkspace(null, true);
      await fetchWorkspaces();

      return response;
    },
    [switchToWorkspace, fetchWorkspaces, locale]
  );

/**
 * Hook to delete a workspace user.
 *
 * @param users - The list of workspace users.
 * @param setUsers - Function to update the users state.
 * @param locale - The current locale.
 */
export const useDeleteUser = (
  users: WorkspaceUser[],
  setUsers: React.Dispatch<React.SetStateAction<WorkspaceUser[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Delete a user from the current workspace and update the context state.
     * @param id - The ID of the user to delete.
     *
     * @returns Irmin API response.
     */
    async (id: number): Promise<IrminAPIResponse> => {
      // Get the user service
      const userService = UserAndRoleService.getInstance(locale);
      // Remove user from workspace
      const response = await userService.removeUserFromWorkspace(id);
      // Remove user from the context state
      setUsers(users.filter((user) => user.id !== id));

      return response;
    },
    [users, setUsers, locale]
  );

/**
 * Hook to change a user's role in the workspace.
 *
 * @param users - The list of workspace users.
 * @param setUsers - Function to update the users state.
 * @param locale - The current locale.
 */
export const useChangeUserRole = (
  users: WorkspaceUser[],
  setUsers: React.Dispatch<React.SetStateAction<WorkspaceUser[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Change a user's role in the workspace and update the context state.
     *
     * @param id - The ID of the user to change the role.
     * @param role - The new role to assign to the user.
     *
     * @returns Irmin API response.
     */
    async (id: number, role: IrminRoleNames): Promise<IrminAPIResponse> => {
      // Get the user service
      const userService = UserAndRoleService.getInstance(locale);
      // Find the user to get current role
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      const currentRole =
        user.roles && user.roles?.length > 0 ? user.roles[0] : null;
      // Change the user's role
      const response = await userService.changeUserRole(
        id,
        role,
        currentRole ? currentRole.name : null
      );
      // Update the user's role in the context state
      setUsers(
        users.map((user) => (user.id === id ? { ...user, role: role } : user))
      );

      return response;
    },
    [users, setUsers, locale]
  );

/**
 * Hook to send an invite to a user.
 *
 * @param currentWorkspace - The current workspace.
 * @param setInvites - Function to update the invites state.
 * @param locale - The current locale.
 */
export const useSendInvite = (
  currentWorkspace: Workspace | null,
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Send an invite to a user and update the context state.
     *
     * @param name - The name of the user to invite.
     * @param email - The email of the user to invite.
     * @param role - The role to assign to the user.
     *
     * @returns Irmin API response.
     */
    async (
      name: string,
      email: string,
      role: IrminRoleNames
    ): Promise<IrminAPIResponse> => {
      // Make sure there is a current workspace
      if (!currentWorkspace) throw new Error('No current workspace');
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Send the invite
      const response = await inviteService.inviteUserToWorkspace(
        name,
        email,
        role
      );
      // Get new invites
      const newInvites = await inviteService.getInvitesByWorkspace(
        currentWorkspace.slug
      );
      // Update the invites in the context state
      setInvites(newInvites.data);

      return response;
    },
    [currentWorkspace, setInvites, locale]
  );

/**
 * Hook to resend an invite to a user.
 *
 * @param locale - The current locale.
 */
export const useResendInvite = (locale: Locale) =>
  useCallback(
    /**
     * Resend an invite to a user and update the context state.
     *
     * @param invite - The ID of the invite to resend.
     *
     * @returns Irmin API response.
     */
    async (invite: number): Promise<IrminAPIResponse> => {
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Resend the invite
      const response = await inviteService.resendUserInvite(invite);

      return response;
    },
    [locale]
  );

/**
 * Hook to cancel an invite to a user.
 *
 * @param invites - The list of workspace invites.
 * @param setInvites - Function to update the invites state.
 * @param locale - The current locale.
 */
export const useCancelInvite = (
  invites: Invite[],
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Cancel an invite to a user and update the context state.
     *
     * @param invite - The ID of the invite to cancel.
     *
     * @returns Irmin API response.
     */
    async (invite: number): Promise<IrminAPIResponse> => {
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Cancel the invite
      const response = await inviteService.cancelUserInvite(invite);
      // Update the invites in the context state
      setInvites(invites.filter((i) => i.id !== invite));

      return response;
    },
    [invites, setInvites, locale]
  );

/**
 * Hook to change an invite to a user.
 *
 * @param invites - The list of workspace invites.
 * @param setInvites - Function to update the invites state.
 * @param locale - The current locale.
 */
export const useChangeInvite = (
  invites: Invite[],
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Change an invite to a user and update the context state.
     *
     * @param invite - The ID of the invite to change.
     * @param role - The role to assign to the user.
     *
     * @returns Irmin API response.
     */
    async (invite: number, role: IrminRole): Promise<IrminAPIResponse> => {
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Change the invite
      const response = await inviteService.changeUserInviteRole(
        invite,
        role.name
      );
      // Update the invites in the context state
      setInvites(
        invites.map((i) => (i.id === invite ? { ...i, role: role } : i))
      );

      return response;
    },
    [invites, setInvites, locale]
  );
