'use client';

import { useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { IrminRole } from '@/types/core/IrminRole';
import { User } from '@/types/core/User';
import { Workspace } from '@/types/core/Workspace';

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
  irminCore,
}: {
  currentWorkspace: Workspace | null;
  irminCore: IrminCore;
}) => {
  // Roles
  const [irminRoles, setIrminRoles] = useState<IrminRole[]>([]);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFetchedFor, setUsersFetchedFor] = useState<string | null>(null);

  /**
   * Hook to fetch the roles.
   */
  const fetchRoles = useFetchRoles(setIrminRoles, irminCore);

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
    irminCore
  );

  /**
   * Hook to delete a user. It calls the API to delete the user,
   * and fetches the updated users.
   */
  const deleteUser = useDeleteUser(users, setUsers, irminCore);

  /**
   * Hook to change the role of a user. It calls the API to change the role,
   * and fetches the updated users.
   */
  const changeUserRole = useChangeUserRole(users, setUsers, irminCore);

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
