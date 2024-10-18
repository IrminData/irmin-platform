'use client';

import { useCallback } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { IrminRole, IrminRoleNames } from '@/types/core/IrminRole';
import { User } from '@/types/core/User';
import { Workspace } from '@/types/core/Workspace';

/**
 * Hook to fetch the list of roles available on Irmin using the {@link IrminCore}.
 */
export const useFetchRoles = (
  setIrminRoles: React.Dispatch<React.SetStateAction<IrminRole[]>>,
  irminCore: IrminCore
) =>
  useCallback(async () => {
    try {
      // Fetch the roles
      const data = await irminCore.roleService.fetchRoles();
      setIrminRoles(data.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setIrminRoles([]);
      throw error;
    }
  }, [setIrminRoles, irminCore]);

/**
 * Hook to fetch the list of users for the current workspace using the {@link IrminCore}.
 */
export const useFetchUsers = (
  currentWorkspace: Workspace | null,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
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
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setUsers([]);
          return;
        }
        // Fetch the data
        const res = await irminCore.userService.fetchWorkspaceUsers();
        setUsers(res.data);
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
      irminCore,
    ]
  );

/**
 * Hook to delete a workspace user using the {@link IrminCore}.
 */
export const useDeleteUser = (
  users: User[],
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (id: string) => {
      // Remove user from workspace
      const res = await irminCore.userService.removeUserFromWorkspace(id);
      // Remove user from the context state
      setUsers(users.filter((user) => user.id !== id));

      return res;
    },
    [users, setUsers, irminCore]
  );

/**
 * Hook to change a user's role in the workspace using the {@link IrminCore}.
 */
export const useChangeUserRole = (
  users: User[],
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (id: string, role: IrminRoleNames) => {
      // Find the user to get current role
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      const currentRole =
        user.roles && user.roles?.length > 0 ? user.roles[0] : null;
      // Change the user's role
      const res = await irminCore.userService.changeUserRole(
        id,
        role,
        currentRole ? currentRole.name : null
      );
      // Update the user's role in the context state
      setUsers(
        users.map((user) => (user.id === id ? { ...user, role: role } : user))
      );

      return res;
    },
    [users, setUsers, irminCore]
  );
