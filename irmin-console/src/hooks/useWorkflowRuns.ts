import { useCallback, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  IrminAPIPaginationMetadata,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import { WorkflowRun } from '@/types/core/WorkflowRun';

interface WorkflowRunsResponse
  extends Omit<IrminAPIResponse<WorkflowRun[]>, 'pagination'> {
  pagination?: IrminAPIPaginationMetadata;
}

export const workflowRunsQueryKey = (
  workspaceSlug: string,
  workflowID: string,
  page: number
) => ['workflow-runs', workspaceSlug, workflowID, page] as const;

/**
 * Custom hook to manage fetching and pagination of workflow runs
 *
 * @param workflowID - unique identifier of the workflow
 * @returns pagination state and control functions
 */
const useWorkflowRuns = (workflowID: string) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);

  const workflowRunsQuery = useQuery<WorkflowRunsResponse, Error>({
    queryKey: workflowRunsQueryKey(workspaceSlug, workflowID, currentPage),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.workflowRunService.fetchWorkflowRuns({
        workspace: workspaceSlug,
        workflowID,
        perPage: 10,
        page: currentPage,
      });
    },
  });

  const createWorkflowRunMutation = useMutation<
    IrminAPIResponse<WorkflowRun>,
    Error,
    void
  >({
    mutationFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowRunService.triggerWorkflowRun({
        workspace: workspaceSlug,
        workflowID,
      });
      return res;
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Workflow run created successfully');
      setCurrentPage(1);
      queryClient.invalidateQueries({
        queryKey: workflowRunsQueryKey(workspaceSlug, workflowID, 1),
      });
    },
    onError: (error) => {
      console.error('Failed to create workflow run', error);
      irminAlert('error', error.message ?? 'Failed to create workflow run');
    },
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

export default useWorkflowRuns;
