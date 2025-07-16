import { useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { policiesQueryKey, policyQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Policy } from '@/types/core/Policy';

export function usePolicy(policyId?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const policyQuery = useQuery<IrminAPIResponse<Policy>, Error>({
    queryKey: policyQueryKey(workspaceSlug, policyId),
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
    enabled: !!policyId,
  });

  return {
    // Queries
    policyQuery,
  };
}
