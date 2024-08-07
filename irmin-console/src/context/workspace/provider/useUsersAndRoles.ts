'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useChangeUserRole,
  useDeleteUser,
  useFetchRoles,
  useFetchUsers,
} from '@/context/workspace/hooks/usersAndRoles';

import { IrminRole } from '@/types/api/IrminRole';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Combined hook for users and roles to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
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
