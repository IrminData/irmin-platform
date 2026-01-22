import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { connectionSubscriptionsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  ConnectionSubscription,
  ConnectionSubscriptionWithToken,
  CreateConnectionSubscriptionRequest,
  UpdateConnectionSubscriptionRequest,
} from '@/types/core/ConnectionSubscription';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Hook for managing connection subscriptions.
 *
 * @param connectionID - The connection ID to manage subscriptions for.
 * @param enabled - Whether to enable the query (default: true).
 * @returns Query and mutation functions for connection subscriptions.
 */
export function useConnectionSubscriptions(
  connectionID: string,
  enabled: boolean = true
) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  // Query for fetching all subscriptions for a connection
  const subscriptionsQuery = useQuery<
    IrminAPIResponse<ConnectionSubscription[]>
  >({
    queryKey: connectionSubscriptionsQueryKey(workspaceSlug, connectionID),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.connectionSubscriptionService.fetchSubscriptions({
        workspace: workspaceSlug,
        connectionID,
      });
    },
    enabled: !!connectionID && enabled,
  });

  // Mutation for creating a new subscription
  const createSubscriptionMutation = useMutation<
    IrminAPIResponse<ConnectionSubscriptionWithToken>,
    Error,
    CreateConnectionSubscriptionRequest
  >({
    mutationFn: async (data) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.connectionSubscriptionService.createSubscription({
        workspace: workspaceSlug,
        connectionID,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: connectionSubscriptionsQueryKey(workspaceSlug, connectionID),
      });
    },
  });

  // Mutation for updating a subscription
  const updateSubscriptionMutation = useMutation<
    IrminAPIResponse<ConnectionSubscription>,
    Error,
    { subscriptionID: string; data: UpdateConnectionSubscriptionRequest }
  >({
    mutationFn: async ({ subscriptionID, data }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.connectionSubscriptionService.updateSubscription({
        workspace: workspaceSlug,
        connectionID,
        subscriptionID,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: connectionSubscriptionsQueryKey(workspaceSlug, connectionID),
      });
    },
  });

  // Mutation for deleting a subscription
  const deleteSubscriptionMutation = useMutation<
    IrminAPIResponse,
    Error,
    string
  >({
    mutationFn: async (subscriptionID) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.connectionSubscriptionService.deleteSubscription({
        workspace: workspaceSlug,
        connectionID,
        subscriptionID,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: connectionSubscriptionsQueryKey(workspaceSlug, connectionID),
      });
    },
  });

  // Mutation for regenerating a subscription token
  const regenerateTokenMutation = useMutation<
    IrminAPIResponse<ConnectionSubscriptionWithToken>,
    Error,
    string
  >({
    mutationFn: async (subscriptionID) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.connectionSubscriptionService.regenerateToken({
        workspace: workspaceSlug,
        connectionID,
        subscriptionID,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: connectionSubscriptionsQueryKey(workspaceSlug, connectionID),
      });
    },
  });

  return {
    // Queries
    subscriptionsQuery,

    // Mutations
    createSubscriptionMutation,
    updateSubscriptionMutation,
    deleteSubscriptionMutation,
    regenerateTokenMutation,
  };
}
