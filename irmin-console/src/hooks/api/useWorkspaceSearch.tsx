import { useQuery } from '@tanstack/react-query';

import { workspaceSearchQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { SearchFilters, SearchResponse } from '@/types/core/Search';

export function useWorkspaceSearch(
  params: SearchFilters,
  workspaceSlug?: string,
  options?: {
    enabled?: boolean;
  }
) {
  const { getCore } = useIrminCore();

  const workspaceSearchQuery = useQuery<
    IrminAPIResponse<SearchResponse>,
    Error
  >({
    queryKey: workspaceSearchQueryKey(workspaceSlug ?? '', params),
    queryFn: async () => {
      if (!workspaceSlug) throw new Error('Workspace slug is required');

      const core = await getCore();
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
