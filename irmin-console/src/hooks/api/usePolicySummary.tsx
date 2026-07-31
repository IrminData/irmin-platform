import { useQuery } from '@tanstack/react-query';

import { policySummaryQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { UserPolicySummary } from '@/types/core/Policy';

export function usePolicySummary(workspaceSlug?: string) {
  const { getCore } = useIrminCore();

  const policySummaryQuery = useQuery<
    IrminAPIResponse<UserPolicySummary>,
    Error
  >({
    queryKey: policySummaryQueryKey(workspaceSlug ?? ''),
    queryFn: async () => {
      if (!workspaceSlug) throw new Error('Workspace slug is required');
      const core = await getCore();
      return await core.policyService.getPolicyUserSummary({
        workspace: workspaceSlug,
      });
    },
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes - policy summaries don't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
  });

  return {
    // Queries
    policySummaryQuery,
  };
}
