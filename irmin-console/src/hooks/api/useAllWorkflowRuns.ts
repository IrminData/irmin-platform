import { useCallback, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { workflowRunsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type {
  IrminAPIPaginationMetadata,
  IrminAPIResponse,
} from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

interface AllWorkflowRunsResponse extends Omit<
  IrminAPIResponse<WorkflowRun[]>,
  'pagination'
> {
  pagination?: IrminAPIPaginationMetadata;
}

/**
 * Custom hook to manage fetching and pagination of all workflow runs in a workspace
 *
 * @returns pagination state and control functions
 */
export const useAllWorkflowRuns = () => {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();

  const [currentPage, setCurrentPage] = useState(1);

  const allWorkflowRunsQuery = useQuery<AllWorkflowRunsResponse, Error>({
    queryKey: workflowRunsQueryKey(workspaceSlug, 'all', currentPage),
    queryFn: async () => {
      const core = await getCore();
      return core.workflowRunService.fetchAllWorkflowRuns({
        workspace: workspaceSlug,
        perPage: 10,
        page: currentPage,
      });
    },
  });

  const goToPage = useCallback(
    (page: number) => {
      if (
        page < 1 ||
        page > (allWorkflowRunsQuery.data?.pagination?.total_pages ?? 1)
      ) {
        console.error('Invalid page number', page);
        return;
      }
      setCurrentPage(page);
    },
    [allWorkflowRunsQuery.data?.pagination?.total_pages]
  );

  return {
    // Pagination state
    currentPage,
    totalPages: allWorkflowRunsQuery.data?.pagination?.total_pages ?? 1,
    goToPage,

    // Query
    allWorkflowRunsQuery,
  };
};
