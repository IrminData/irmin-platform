import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { policyResourceOptionsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { PolicyResourceOptions } from '@/types/core/Policy';

export function usePolicyResourceOptions() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const policyResourceOptionsQuery = useQuery<
    IrminAPIResponse<PolicyResourceOptions>,
    Error
  >({
    queryKey: policyResourceOptionsQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
