import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryObjectHistoryQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export function useRepositoryObjectHistory(
  repositorySlug: string,
  branch: string,
  path: string
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const objectHistoryQuery = useQuery({
    queryKey: repositoryObjectHistoryQueryKey(
      workspaceSlug,
      repositorySlug,
      branch,
      path
    ),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.objectService.getObjectHistory({
        workspace: workspaceSlug,
        repository: repositorySlug,
        path: path,
        ref: branch,
      });
      return res;
    },
  });

  return { objectHistoryQuery };
}
