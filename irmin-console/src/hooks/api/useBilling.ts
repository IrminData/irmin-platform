import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  billingInfoQueryKey,
  billingSubscriptionQueryKey,
  billingUsageQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  BillingInfo,
  PlanInfo,
  UsageDimensionSummary,
} from '@/types/core/Billing';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Hook for billing queries and mutations.
 *
 * @param options - Optional configuration
 * @param options.enabled - Whether to enable billing queries (defaults to true)
 * @param options.fetchBillingInfo - Whether to fetch billing info (defaults to false)
 * @returns Billing queries, derived data, and mutation helpers.
 */
export function useBilling(options?: {
  enabled?: boolean;
  fetchBillingInfo?: boolean;
}) {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const enabled = options?.enabled ?? true;
  const fetchBillingInfo = options?.fetchBillingInfo ?? false;

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
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.createCheckoutFailed
      );
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
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.openBillingPortalFailed
      );
    },
  });

  const billingInfoQuery = useQuery<IrminAPIResponse<BillingInfo>, Error>({
    queryKey: billingInfoQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      return await core.billingService.fetchBillingInfo({ workspaceSlug });
    },
    enabled: enabled && fetchBillingInfo,
  });

  const updateBillingInfoMutation = useMutation<
    IrminAPIResponse<BillingInfo>,
    Error,
    Partial<BillingInfo>
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return await core.billingService.updateBillingInfo({
        workspaceSlug,
        data,
      });
    },
    onSuccess: (res) => {
      queryClient.setQueryData(billingInfoQueryKey(workspaceSlug), res);
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.updateBillingFailed
      );
    },
  });

  return {
    // Queries
    subscriptionQuery,
    subscription: subscriptionQuery.data?.data,
    usageQuery,
    usage: usageQuery.data?.data,
    billingInfoQuery,
    billingInfo: billingInfoQuery.data?.data,

    // Mutations
    checkoutMutation,
    portalMutation,
    updateBillingInfoMutation,
  };
}
