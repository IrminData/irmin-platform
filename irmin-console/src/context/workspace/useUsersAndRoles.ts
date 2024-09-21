'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { IrminRole } from '@/types/core/IrminRole';
import { Workspace, WorkspaceUser } from '@/types/core/Workspace';

import {
  useChangeUserRole,
  useDeleteUser,
  useFetchRoles,
  useFetchUsers,
} from './hooks/usersAndRoles';

/**
 * Hook for users and roles to be used in the Workspace Provider
 */
const useUsersAndRoles = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Roles
  const [irminRoles, setIrminRoles] = useState<IrminRole[]>([]);

  // Users
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFetchedFor, setUsersFetchedFor] = useState<string | null>(null);

  /**
   * Hook to fetch the roles.
   */
  const fetchRoles = useFetchRoles(setIrminRoles, locale);

  /**
   * Hook to fetch the users for the current workspace.
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
   * Hook to delete a user. It calls the API to delete the user,
   * and fetches the updated users.
   */
  const deleteUser = useDeleteUser(users, setUsers, locale);

  /**
   * Hook to change the role of a user. It calls the API to change the role,
   * and fetches the updated users.
   */
  const changeUserRole = useChangeUserRole(users, setUsers, locale);

  return {
    irminRoles,
    users,
    usersLoading,
    setUsers,
    setIrminRoles,
    fetchUsers,
    deleteUser,
    changeUserRole,
    fetchRoles,
  };
};

export default useUsersAndRoles;
