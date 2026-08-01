import { useQuery } from '@tanstack/react-query';

import { rolePolicySummaryQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { RolePolicySummary } from '@/types/core/Policy';

/**
 * Hook to fetch role policy summary for the current workspace.
 *
 * @returns The role policy summary query result.
 */
export function useRolePolicySummary() {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const rolePolicySummaryQuery = useQuery<
    IrminAPIResponse<RolePolicySummary[]>
  >({
    queryKey: rolePolicySummaryQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return core.policyService.getPolicyRoleSummary({
        workspace: workspaceSlug,
      });
    },
    enabled: !!workspaceSlug,
  });

  return { rolePolicySummaryQuery };
}
