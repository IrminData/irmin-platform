import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { workspaceSearchQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { SearchFilters, SearchResponse } from '@/types/core/Search';

export function useWorkspaceSearch(
  params: SearchFilters,
  workspaceSlug?: string,
  options?: {
    enabled?: boolean;
  }
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  const workspaceSearchQuery = useQuery<
    IrminAPIResponse<SearchResponse>,
    Error
  >({
    queryKey: workspaceSearchQueryKey(workspaceSlug ?? '', params),
    queryFn: async () => {
      if (!workspaceSlug) throw new Error('Workspace slug is required');

      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.searchService.search({
        workspace: workspaceSlug,
        params,
      });
    },
    enabled: options?.enabled !== false && !!workspaceSlug,
  });

  return {
    // Queries
    workspaceSearchQuery,
  };
}
