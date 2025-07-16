import { useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { userQueryKey, usersQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { User } from '@/types/core/User';

export function useUser(userID: string) {
  const { workspaceSlug } = useWorkspaceContext();
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  // Query for fetching a single user by ID
  const userQuery = useQuery<IrminAPIResponse<User>>({
    queryKey: userQueryKey(userID!, workspaceSlug),
    queryFn: async () => {
      if (!userID) throw new Error('User ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
