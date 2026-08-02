import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { connectionSubscriptionsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { isTempId } from '@/utils/generateTempId';

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
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  // Query for fetching all subscriptions for a connection
  const subscriptionsQuery = useQuery<
    IrminAPIResponse<ConnectionSubscription[]>
  >({
    queryKey: connectionSubscriptionsQueryKey(workspaceSlug, connectionID),
    queryFn: async () => {
      const core = await getCore();
      return core.connectionSubscriptionService.fetchSubscriptions({
        workspace: workspaceSlug,
        connectionID,
      });
    },
    // Skip fetch on optimistic-create temp connection ids — the
    // subscriptions endpoint would 404 on a non-SQID connection id.
    enabled: !!connectionID && !isTempId(connectionID) && enabled,
  });

  // Mutation for creating a new subscription
  const createSubscriptionMutation = useMutation<
    IrminAPIResponse<ConnectionSubscriptionWithToken>,
    Error,
    CreateConnectionSubscriptionRequest
  >({
    mutationFn: async (data) => {
      const core = await getCore();
      return core.connectionSubscriptionService.createSubscription({
        workspace: workspaceSlug,
        connectionID,
        data,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
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
      const core = await getCore();
      return core.connectionSubscriptionService.updateSubscription({
        workspace: workspaceSlug,
        connectionID,
        subscriptionID,
        data,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
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
      const core = await getCore();
      return core.connectionSubscriptionService.deleteSubscription({
        workspace: workspaceSlug,
        connectionID,
        subscriptionID,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
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
      const core = await getCore();
      return core.connectionSubscriptionService.regenerateToken({
        workspace: workspaceSlug,
        connectionID,
        subscriptionID,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
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
