import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Policy } from '@/types/core/Policy';

export const policyQueryKey = (workspaceSlug: string, policyId?: string) =>
  ['policy', workspaceSlug, policyId] as const;

export function usePolicy(policyId?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

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
    enabled: !!policyId,
  });

  return {
    // Queries
    policyQuery,
  };
}
