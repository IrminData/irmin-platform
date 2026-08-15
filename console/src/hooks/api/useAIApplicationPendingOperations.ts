import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiApplicationPendingOperationsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIApplicationPendingOperationsResponse } from '@/types/core/AIApplication';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

interface UseAIApplicationPendingOperationsOptions {
  /** Number of items per page (default: 10) */
  limit?: number;
  /** Page offset (default: 0) */
  offset?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for fetching and managing pending operations for an AI Application
 */
export function useAIApplicationPendingOperations(
  aiApplicationId: string,
  options: UseAIApplicationPendingOperationsOptions = {}
) {
  const { limit = 10, offset = 0, enabled = true } = options;
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const pendingOperationsQuery = useQuery<
    IrminAPIResponse<AIApplicationPendingOperationsResponse>,
    Error
  >({
    queryKey: [
      ...aiApplicationPendingOperationsQueryKey(workspaceSlug, aiApplicationId),
      limit,
      offset,
    ],
    queryFn: async () => {
      const core = await getCore();
      return await core.aiApplicationService.getPendingOperations({
        workspace: workspaceSlug,
        aiApplicationId,
        limit,
        offset,
      });
    },
    // Only enable query and polling when the feature is enabled
    enabled,
    // Refetch every 30 seconds to catch new pending operations (only when enabled)
    refetchInterval: enabled ? 30000 : false,
  });

  const approveMutation = useMutation<
    IrminAPIResponse,
    Error,
    { pendingOperationId: string }
  >({
    mutationFn: async ({ pendingOperationId }) => {
      const core = await getCore();
      return await core.aiApplicationService.approvePendingOperation({
        workspace: workspaceSlug,
        aiApplicationId,
        pendingOperationId,
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Pending operation completed');
      void queryClient.invalidateQueries({
        queryKey: aiApplicationPendingOperationsQueryKey(
          workspaceSlug,
          aiApplicationId
        ),
      });
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.approveOperationFailed
      );
    },
  });

  const rejectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { pendingOperationId: string }
  >({
    mutationFn: async ({ pendingOperationId }) => {
      const core = await getCore();
      return await core.aiApplicationService.rejectPendingOperation({
        workspace: workspaceSlug,
        aiApplicationId,
        pendingOperationId,
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Pending operation rejected');
      void queryClient.invalidateQueries({
        queryKey: aiApplicationPendingOperationsQueryKey(
          workspaceSlug,
          aiApplicationId
        ),
      });
    },
    onError: (error) => {
      irminAlert(
        'error',
        error.message ?? dict.common.errors.mutations.rejectOperationFailed
      );
    },
  });

  return {
    // Queries
    pendingOperationsQuery,

    // Mutations
    approveMutation,
    rejectMutation,
  };
}
