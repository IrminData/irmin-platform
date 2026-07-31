import { useQuery } from '@tanstack/react-query';

import { repositoryDiffContentQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

/** Result of fetching diff content for both sides of a comparison. */
export interface DiffContentResult {
  base: IrminAPIBinaryResponse | null;
  compare: IrminAPIBinaryResponse | null;
  baseError: string | null;
  compareError: string | null;
}

/**
 * Hook to fetch the content of both sides of a diff for a specific file.
 *
 * @param repositorySlug - The repository slug
 * @param base - The base ref
 * @param compare - The compare ref
 * @param objectPath - The path of the object to diff
 */
export function useRepositoryDiffContent(
  repositorySlug: string,
  base?: string,
  compare?: string,
  objectPath?: string
) {
  const { getCore } = useIrminCore();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const diffContentQuery = useQuery<DiffContentResult, Error>({
    queryKey: repositoryDiffContentQueryKey(
      workspaceSlug,
      repositorySlug,
      objectPath ?? '',
      base ?? '',
      compare ?? ''
    ),
    queryFn: async () => {
      const core = await getCore();
      // Use allSettled so a failure on one side (e.g. 413 too large, or 404
      // for added/removed files) doesn't prevent showing the other side.
      const [baseResult, compareResult] = await Promise.allSettled([
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
        base: baseResult.status === 'fulfilled' ? baseResult.value : null,
        compare:
          compareResult.status === 'fulfilled' ? compareResult.value : null,
        baseError:
          baseResult.status === 'rejected'
            ? (baseResult.reason as Error).message
            : null,
        compareError:
          compareResult.status === 'rejected'
            ? (compareResult.reason as Error).message
            : null,
      };
    },
    select: (data) => {
      const localize = (msg: string | null): string | null => {
        if (msg?.includes('status 413') || msg?.startsWith('[413]'))
          return dict.repository.objects.contentTooLarge;
        return msg;
      };
      return {
        ...data,
        baseError: localize(data.baseError),
        compareError: localize(data.compareError),
      };
    },
    enabled: !!base && !!compare && !!objectPath,
  });

  return {
    // Queries
    diffContentQuery,
  };
}
