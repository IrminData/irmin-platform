import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { User } from '@/types/core/User';

import {
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

type ChangeUserRoleInput = {
  id: string;
  roles: string[];
};

export function useUsers() {
  const { workspaceSlug } = useWorkspaceContext();
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const queryClient = useQueryClient();

  // Query for fetching all users in the current workspace
  const usersQuery = useQuery<IrminAPIResponse<User[]>>({
    queryKey: usersQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      const users = await core.userService.fetchWorkspaceUsers({
        workspace: workspaceSlug,
      });
      return users;
    },
  });

  // Mutation for deleting a user
  const deleteUserMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (userID: string) => {
      const core = await getCore();
      const res = await core.userService.removeUserFromWorkspace({
        workspace: workspaceSlug,
        user: userID,
      });
      return res;
    },
    ...deleteMutationHandlers<User>(queryClient, {
      cacheConfig: {
        primaryQueryKey: usersQueryKey(workspaceSlug),
        getItemId: (user) => user.id,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'User deleted successfully');
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.deleteUserFailed
        );
      },
    }),
  });

  // Mutation for changing a user's role
  const changeUserRoleMutation = useMutation<
    IrminAPIResponse<User>,
    Error,
    ChangeUserRoleInput
  >({
    mutationFn: async (input) => {
      const core = await getCore();
      const res = await core.userService.changeUserRole({
        workspace: workspaceSlug,
        user: input.id,
        roles: input.roles,
      });
      return res;
    },
    ...updateMutationHandlers<User, ChangeUserRoleInput>(queryClient, {
      cacheConfig: {
        primaryQueryKey: usersQueryKey(workspaceSlug),
        getItemId: (user) => user.id,
      },
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'User role changed successfully');
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.changeRoleFailed
        );
      },
    }),
  });

  return {
    // Queries
    usersQuery,
    // Mutations
    deleteUserMutation,
    changeUserRoleMutation,
  };
}
