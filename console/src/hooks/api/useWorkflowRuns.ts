import { useCallback, useState } from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { workflowRunQueryKey, workflowRunsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  IrminAPIPaginationMetadata,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

import { createMutationHandlers } from './mutations/utils';

interface WorkflowRunsResponse extends Omit<
  IrminAPIResponse<WorkflowRun[]>,
  'pagination'
> {
  pagination?: IrminAPIPaginationMetadata;
}

/**
 * Custom hook to manage fetching and pagination of workflow runs
 *
 * @param workflowID - unique identifier of the workflow
 * @param options - optional query options to pass to useQuery
 * @returns pagination state and control functions
 */
export const useWorkflowRuns = (
  workflowID: string,
  options?: Omit<
    UseQueryOptions<WorkflowRunsResponse, Error>,
    'queryKey' | 'queryFn'
  >
) => {
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);

  const workflowRunsQuery = useQuery<WorkflowRunsResponse, Error>({
    queryKey: workflowRunsQueryKey(workspaceSlug, workflowID, currentPage),
    queryFn: async () => {
      const core = await getCore();
      return core.workflowRunService.fetchWorkflowRuns({
        workspace: workspaceSlug,
        workflowID,
        perPage: 10,
        page: currentPage,
      });
    },
    ...options,
  });

  const createWorkflowRunMutation = useMutation<
    IrminAPIResponse<WorkflowRun>,
    Error,
    void
  >({
    mutationFn: async () => {
      const core = await getCore();
      const res = await core.workflowRunService.triggerWorkflowRun({
        workspace: workspaceSlug,
        workflowID,
      });
      return res;
    },
    ...createMutationHandlers<WorkflowRun, void>(queryClient, 'workflow-runs', {
      cacheConfig: {
        primaryQueryKey: workflowRunsQueryKey(workspaceSlug, workflowID, 1),
        getItemId: (run) => run.id,
        createOptimisticItem: (_input: void, tempId: string) => ({
          id: tempId,
          status: 'pending',
          started_at: new Date().toISOString(),
          finished_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          workflow_id: workflowID,
          workflow_name: 'Loading...',
          workflow_type: 'action',
        }),
      },
      onSuccess: (res) => {
        // Also populate the individual run cache for instant access
        if (res.data) {
          queryClient.setQueryData(
            workflowRunQueryKey(workspaceSlug, workflowID, res.data.id),
            res
          );
        }

        irminAlert(
          'success',
          res.message ?? 'Workflow run created successfully'
        );
        setCurrentPage(1);
      },
      onError: (error) => {
        irminAlert(
          'error',
          error.message ?? dict.common.errors.mutations.createWorkflowRunFailed
        );
      },
    }),
  });

  const goToPage = useCallback(
    (page: number) => {
      if (
        page < 1 ||
        page > (workflowRunsQuery.data?.pagination?.total_pages ?? 1)
      ) {
        console.error('Invalid page number', page);
        return;
      }
      setCurrentPage(page);
    },
    [workflowRunsQuery.data?.pagination?.total_pages]
  );

  return {
    // Pagination state
    currentPage,
    totalPages: workflowRunsQuery.data?.pagination?.total_pages ?? 1,
    goToPage,

    // Query
    workflowRunsQuery,

    // Mutations
    createWorkflowRunMutation,
  };
};
