import { useQuery, useQueryClient } from '@tanstack/react-query';

import { userQueryKey, usersQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { User } from '@/types/core/User';

export function useUser(userID: string) {
  const { workspaceSlug } = useWorkspaceContext();
  const { getCore } = useIrminCore();
  const queryClient = useQueryClient();

  // Query for fetching a single user by ID
  const userQuery = useQuery<IrminAPIResponse<User>>({
    queryKey: userQueryKey(userID!, workspaceSlug),
    queryFn: async () => {
      if (!userID) throw new Error('User ID is required');
      const core = await getCore();
      const user = await core.userService.fetchUser({
        workspace: workspaceSlug,
        user: userID,
      });
      return user;
    },
    initialData: () => {
      const users = queryClient.getQueryData<IrminAPIResponse<User[]>>(
        usersQueryKey(workspaceSlug)
      );
      return users?.data?.find((u: User) => u.id === userID)
        ? {
            data: users.data.find((u: User) => u.id === userID),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
    enabled: !!userID,
  });

  return {
    // Queries
    userQuery,
  };
}
