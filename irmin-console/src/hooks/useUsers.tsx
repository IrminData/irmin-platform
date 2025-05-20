import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { IrminRole } from '@/types/core/IrminRole';
import { User } from '@/types/core/User';

export const usersQueryKey = (workspaceSlug: string) =>
  ['users', workspaceSlug] as const;
type ChangeUserRoleInput = {
  id: string;
  roles: IrminRole[];
};

export function useUsers() {
  const { workspaceSlug } = useWorkspaceContext();
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  // Query for fetching all users in the current workspace
  const usersQuery = useQuery<IrminAPIResponse<User[]>>({
    queryKey: usersQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const users = await core.userService.fetchWorkspaceUsers({
        workspace: workspaceSlug,
      });
      return users;
    },
  });

  // Mutation for deleting a user
  const deleteUserMutation = useMutation({
    mutationFn: async (userID: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.userService.removeUserFromWorkspace({
        workspace: workspaceSlug,
        user: userID,
      });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey(workspaceSlug) });
      irminAlert('success', res.message ?? 'User deleted successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the user'
      );
    },
  });

  // Mutation for changing a user's role
  const changeUserRoleMutation = useMutation<
    IrminAPIResponse<User>,
    Error,
    ChangeUserRoleInput
  >({
    mutationFn: async (input) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.userService.changeUserRole({
        workspace: workspaceSlug,
        user: input.id,
        roles: input.roles,
      });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey(workspaceSlug) });
      irminAlert('success', res.message ?? 'User role changed successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error changing the user role'
      );
    },
  });

  return {
    // Queries
    usersQuery,
    // Mutations
    deleteUserMutation,
    changeUserRoleMutation,
  };
}
