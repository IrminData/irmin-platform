import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { aiApplicationPendingWritesQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { AIApplicationPendingWritesResponse } from '@/types/core/AIApplication';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

interface UseAIApplicationPendingWritesOptions {
  /** Number of items per page (default: 10) */
  limit?: number;
  /** Page offset (default: 0) */
  offset?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for fetching and managing pending writes for an AI Application
 */
export function useAIApplicationPendingWrites(
  aiApplicationId: string,
  options: UseAIApplicationPendingWritesOptions = {}
) {
  const { limit = 10, offset = 0, enabled = true } = options;
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const pendingWritesQuery = useQuery<
    IrminAPIResponse<AIApplicationPendingWritesResponse>,
    Error
  >({
    queryKey: [
      ...aiApplicationPendingWritesQueryKey(workspaceSlug, aiApplicationId),
      limit,
      offset,
    ],
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.aiApplicationService.getPendingWrites({
        workspace: workspaceSlug,
        aiApplicationId,
        limit,
        offset,
      });
    },
    // Only enable query and polling when the feature is enabled
    enabled,
    // Refetch every 30 seconds to catch new pending writes (only when enabled)
    refetchInterval: enabled ? 30000 : false,
  });

  const approveMutation = useMutation<
    IrminAPIResponse,
    Error,
    { pendingWriteId: string }
  >({
    mutationFn: async ({ pendingWriteId }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.aiApplicationService.approvePendingWrite({
        workspace: workspaceSlug,
        aiApplicationId,
        pendingWriteId,
      });
    },
    onSuccess: (res) => {
      irminAlert(
        'success',
        res.message ?? 'Pending write approved and executed'
      );
      queryClient.invalidateQueries({
        queryKey: aiApplicationPendingWritesQueryKey(
          workspaceSlug,
          aiApplicationId
        ),
      });
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to approve pending write');
    },
  });

  const rejectMutation = useMutation<
    IrminAPIResponse,
    Error,
    { pendingWriteId: string }
  >({
    mutationFn: async ({ pendingWriteId }) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.aiApplicationService.rejectPendingWrite({
        workspace: workspaceSlug,
        aiApplicationId,
        pendingWriteId,
      });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Pending write rejected');
      queryClient.invalidateQueries({
        queryKey: aiApplicationPendingWritesQueryKey(
          workspaceSlug,
          aiApplicationId
        ),
      });
    },
    onError: (error) => {
      irminAlert('error', error.message ?? 'Failed to reject pending write');
    },
  });

  return {
    // Queries
    pendingWritesQuery,

    // Mutations
    approveMutation,
    rejectMutation,
  };
}
