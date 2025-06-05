import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { PolicyResourceOptions } from '@/types/core/Policy';

export const policyResourceOptionsQueryKey = (workspaceSlug: string) =>
  ['policy-resource-options', workspaceSlug] as const;

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
