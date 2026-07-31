import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { workflowRunQueryKey, workflowRunsQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { isTempId } from '@/utils/generateTempId';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { WorkflowRun } from '@/types/core/WorkflowRun';

/**
 * Custom hook to manage fetching a workflow run
 *
 * @param workflowID - unique identifier of the workflow
 * @param runID - unique identifier of the workflow run
 * @param options - optional query options (e.g., refetchInterval)
 * @returns the workflow run
 */
export const useWorkflowRun = (
  workflowID: string,
  runID: string,
  options?: Partial<
    UseQueryOptions<
      IrminAPIResponse<WorkflowRun>,
      Error,
      IrminAPIResponse<WorkflowRun>
    >
  >
) => {
  const { getCore } = useIrminCore();
  const { workspaceSlug } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const workflowRunQuery = useQuery<IrminAPIResponse<WorkflowRun>, Error>({
    queryKey: workflowRunQueryKey(workspaceSlug, workflowID, runID),
    queryFn: async () => {
      const core = await getCore();
      const res: IrminAPIResponse<WorkflowRun> =
        await core.workflowRunService.fetchWorkflowRun({
          workspace: workspaceSlug,
          workflowID,
          runID,
        });
      return res;
    },
    initialData: () => {
      // Try to find the workflow run in any of the paginated results
      const allWorkflowRunQueries = queryClient.getQueriesData({
        queryKey: workflowRunsQueryKey(workspaceSlug, workflowID),
      });

      for (const [, queryData] of allWorkflowRunQueries) {
        const workflowRuns = queryData as IrminAPIResponse<WorkflowRun[]>;
        const foundRun = workflowRuns?.data?.find(
          (wr: WorkflowRun) => wr.id === runID
        );
        if (foundRun) {
          return { data: foundRun, success: true, message: 'Cached data' };
        }
      }
      return undefined;
    },
    ...options,
    // Skip server fetch when the workflowID is a client-generated
    // temp id (user navigated to the runs page of an
    // optimistic-create workflow before its real SQID came back).
    // Run IDs are always server-assigned so we only guard workflowID.
    // The temp-id guard is combined with `options.enabled` after the
    // spread so a caller cannot accidentally re-enable a fetch against
    // a temp id by passing `enabled: true`.
    enabled:
      !!workflowID &&
      !isTempId(workflowID) &&
      !!runID &&
      options?.enabled !== false,
  });

  return {
    // Query
    workflowRunQuery,
  };
};
