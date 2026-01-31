import { useQuery } from '@tanstack/react-query';

import { repositoryDiffContentQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

export function useRepositoryDiffContent(
  repositorySlug: string,
  base?: string,
  compare?: string,
  objectPath?: string
) {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const diffContentQuery = useQuery<
    {
      base: IrminAPIBinaryResponse | null;
      compare: IrminAPIBinaryResponse | null;
    },
    Error
  >({
    queryKey: repositoryDiffContentQueryKey(
      workspaceSlug,
      repositorySlug,
      objectPath ?? '',
      base ?? '',
      compare ?? ''
    ),
    queryFn: async () => {
      const core = await getCore();
      const [baseContent, compareContent] = await Promise.all([
        core.objectService.getObjectContent({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: objectPath ?? '',
          ref: base,
          limitResponse: true,
        }),
        core.objectService.getObjectContent({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: objectPath ?? '',
          ref: compare,
          limitResponse: true,
        }),
      ]);
      return {
        base: baseContent ?? null,
        compare: compareContent ?? null,
      };
    },
    enabled: !!base && !!compare && !!objectPath,
  });

  return {
    // Queries
    diffContentQuery,
  };
}
