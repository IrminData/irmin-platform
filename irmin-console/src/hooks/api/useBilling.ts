import { useMutation, useQuery } from '@tanstack/react-query';

import {
  billingSubscriptionQueryKey,
  billingUsageQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { PlanInfo, UsageDimensionSummary } from '@/types/core/Billing';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Hook for billing queries and mutations.
 *
 * @param options - Optional configuration
 * @param options.enabled - Whether to enable billing queries (defaults to true)
 * @returns Billing queries, derived data, and mutation helpers.
 */
export function useBilling(options?: { enabled?: boolean }) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();

  const enabled = options?.enabled ?? true;

  const subscriptionQuery = useQuery<IrminAPIResponse<PlanInfo>, Error>({
    queryKey: billingSubscriptionQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.billingService.fetchSubscription({ workspaceSlug });
    },
    enabled,
  });

  const usageQuery = useQuery<IrminAPIResponse<UsageDimensionSummary[]>, Error>(
    {
      queryKey: billingUsageQueryKey(workspaceSlug),
      queryFn: async () => {
        const core = await getCore();
        return await core.billingService.fetchUsage({ workspaceSlug });
      },
      enabled,
    }
  );

  const checkoutMutation = useMutation<
    IrminAPIResponse<{ checkout_url: string }>,
    Error,
    {
      returnURL: string;
    }
  >({
    mutationFn: async ({ returnURL }) => {
      const core = await getCore();
      return await core.billingService.createCheckout({
        workspaceSlug,
        returnURL,
      });
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error creating checkout session');
    },
  });

  const portalMutation = useMutation<
    IrminAPIResponse<{ portal_url: string }>,
    Error,
    void
  >({
    mutationFn: async () => {
      const core = await getCore();
      return await core.billingService.getPortalURL({ workspaceSlug });
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Error opening billing portal');
    },
  });

  return {
    // Queries
    subscriptionQuery,
    subscription: subscriptionQuery.data?.data,
    usageQuery,
    usage: usageQuery.data?.data,

    // Mutations
    checkoutMutation,
    portalMutation,
  };
}
