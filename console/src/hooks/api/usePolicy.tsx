import { useQuery, useQueryClient } from '@tanstack/react-query';

import { policiesQueryKey, policyQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { isTempId } from '@/utils/generateTempId';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Policy } from '@/types/core/Policy';

export function usePolicy(policyId?: string) {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const policyQuery = useQuery<IrminAPIResponse<Policy>, Error>({
    queryKey: policyQueryKey(workspaceSlug, policyId),
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required');
      const core = await getCore();
      return await core.policyService.getPolicy({
        workspace: workspaceSlug,
        policyId: policyId,
      });
    },
    initialData: () => {
      // Try to find the policy in any of the policies cache results
      const allPolicyQueries = queryClient.getQueriesData({
        queryKey: policiesQueryKey(workspaceSlug),
      });

      for (const [, queryData] of allPolicyQueries) {
        const policies = queryData as IrminAPIResponse<Policy[]>;
        const foundPolicy = policies?.data?.find(
          (p: Policy) => p.id === policyId
        );
        if (foundPolicy) {
          return { data: foundPolicy, success: true, message: 'Cached data' };
        }
      }
      return undefined;
    },
    // Skip server fetch on client-generated temp ids (optimistic
    // create); initialData covers the placeholder shape until the
    // real SQID arrives.
    enabled: !!policyId && !isTempId(policyId),
  });

  return {
    // Queries
    policyQuery,
  };
}
