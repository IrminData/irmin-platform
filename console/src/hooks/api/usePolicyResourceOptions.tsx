import { useQuery } from '@tanstack/react-query';

import { policyResourceOptionsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { PolicyResourceOptions } from '@/types/core/Policy';

export function usePolicyResourceOptions() {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const policyResourceOptionsQuery = useQuery<
    IrminAPIResponse<PolicyResourceOptions>,
    Error
  >({
    queryKey: policyResourceOptionsQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.policyService.getPolicyResourceOptions({
        workspace: workspaceSlug,
      });
    },
  });

  return {
    // Queries
    policyResourceOptionsQuery,
  };
}
