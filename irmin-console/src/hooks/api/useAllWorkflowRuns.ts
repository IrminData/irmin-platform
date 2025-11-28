import { useCallback, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { workflowRunsQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
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
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const [currentPage, setCurrentPage] = useState(1);

  const allWorkflowRunsQuery = useQuery<AllWorkflowRunsResponse, Error>({
    queryKey: workflowRunsQueryKey(workspaceSlug, 'all', currentPage),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      return irminCore.workflowRunService.fetchAllWorkflowRuns({
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
