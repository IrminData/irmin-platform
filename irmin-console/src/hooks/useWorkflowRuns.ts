import { useCallback, useEffect, useRef, useState } from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { WorkflowRun } from '@/types/core/WorkflowRun';

/**
 * State and actions for workflow runs, including pagination
 */
interface WorkflowRunsState {
  runs: WorkflowRun[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
}

interface UseWorkflowRunsResult extends WorkflowRunsState {
  /**
   * Change to a specific page of workflow runs
   *
   * @param page - page number to fetch
   */
  goToPage: (page: number) => void;
  /**
   * Trigger a manual refresh of the current page
   */
  refresh: () => void;
  /**
   * Reset to the first page and fetch workflow runs
   */
  resetAndFetch: () => void;
}

/**
 * Custom hook to manage fetching and pagination of workflow runs
 *
 * @param workflowID - unique identifier of the workflow
 * @returns pagination state and control functions
 */
const useWorkflowRuns = (workflowID: string): UseWorkflowRunsResult => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspace();

  const [state, setState] = useState<WorkflowRunsState>({
    runs: [],
    loading: true,
    currentPage: 1,
    totalPages: 1,
  });

  const fetchRuns = useCallback(
    async (page: number) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const result = await irminCore.workflowRunService.fetchWorkflowRuns({
          workspace: workspaceSlug,
          workflowID,
          perPage: 10,
          page,
        });

        setState({
          runs: result.data ?? [],
          loading: false,
          currentPage: page,
          totalPages: result.pagination?.total_pages ?? 1,
        });
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch workflow runs'
        );
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [getToken, irminAlert, locale, workspaceSlug, workflowID]
  );

  // Initial fetch
  const initialFetchDoneFor = useRef('');
  useEffect(() => {
    if (initialFetchDoneFor.current === workflowID) return;
    initialFetchDoneFor.current = workflowID;
    fetchRuns(state.currentPage);
  }, [fetchRuns, workflowID, state.currentPage]);

  /**
   * go to specific page, with validation
   */
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > state.totalPages) {
        console.error('Invalid page number', page);
        return;
      }
      fetchRuns(page);
    },
    [fetchRuns, state.totalPages]
  );

  /**
   * reset and refetch runs
   */
  const resetAndFetch = useCallback(() => {
    setState((prev) => ({ ...prev, currentPage: 1 }));
    fetchRuns(1);
  }, [fetchRuns]);

  return {
    runs: state.runs,
    loading: state.loading,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    goToPage,
    refresh: () => fetchRuns(state.currentPage),
    resetAndFetch,
  };
};

export default useWorkflowRuns;
