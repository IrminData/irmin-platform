import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { User } from '@/types/core/User';

export const userQueryKey = (id: string, workspaceSlug: string) =>
  ['user', id, workspaceSlug] as const;

export function useUser(userID: string) {
  const { workspaceSlug } = useWorkspaceContext();
  const { getToken } = useIAM();
  const { locale } = useLocale();

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
  });

  return {
    // Queries
    userQuery,
  };
}
