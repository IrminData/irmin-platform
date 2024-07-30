'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import UserAndRoleService from '@/lib/api/UserAndRoleService';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

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
