import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { repositoryDiffContentQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';

export function useRepositoryDiffContent(
  repositorySlug: string,
  base?: string,
  compare?: string,
  objectPath?: string
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const [baseContent, compareContent] = await Promise.all([
        core.objectService.getObjectContent({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: objectPath ?? '',
          ref: base,
        }),
        core.objectService.getObjectContent({
          workspace: workspaceSlug,
          repository: repositorySlug,
          path: objectPath ?? '',
          ref: compare,
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
