import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { UserPolicySummary } from '@/types/core/Policy';

export const policySummaryQueryKey = (workspaceSlug: string) =>
  ['policy-summary', workspaceSlug] as const;

export function usePolicySummary(workspaceSlug?: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  const policySummaryQuery = useQuery<
    IrminAPIResponse<UserPolicySummary>,
    Error
  >({
    queryKey: policySummaryQueryKey(workspaceSlug ?? ''),
    queryFn: async () => {
      if (!workspaceSlug) throw new Error('Workspace slug is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.policyService.getPolicyUserSummary({
        workspace: workspaceSlug,
      });
    },
    enabled: !!workspaceSlug,
  });

  return {
    // Queries
    policySummaryQuery,
  };
}
