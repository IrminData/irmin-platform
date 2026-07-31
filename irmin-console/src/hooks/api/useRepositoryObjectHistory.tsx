import { useQuery } from '@tanstack/react-query';

import { repositoryObjectHistoryQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

export function useRepositoryObjectHistory(
  repositorySlug: string,
  branch: string,
  path: string
) {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const objectHistoryQuery = useQuery({
    queryKey: repositoryObjectHistoryQueryKey(
      workspaceSlug,
      repositorySlug,
      branch,
      path
    ),
    queryFn: async () => {
      const irminCore = await getCore();
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
