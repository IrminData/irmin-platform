import { useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { WorkflowRun } from '@/types/core/WorkflowRun';

export const workflowRunQueryKey = (
  workspaceSlug: string,
  workflowID: string,
  runID: string
) => ['workflow-run', workspaceSlug, workflowID, runID] as const;

/**
 * Custom hook to manage fetching a workflow run
 *
 * @param workflowID - unique identifier of the workflow
 * @param runID - unique identifier of the workflow run
 * @returns the workflow run
 */
const useWorkflowRun = (workflowID: string, runID: string) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { workspaceSlug } = useWorkspaceContext();

  const workflowRunQuery = useQuery<IrminAPIResponse<WorkflowRun>, Error>({
    queryKey: workflowRunQueryKey(workspaceSlug, workflowID, runID),
    queryFn: async () => {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res: IrminAPIResponse<WorkflowRun> =
        await irminCore.workflowRunService.fetchWorkflowRun({
          workspace: workspaceSlug,
          workflowID,
          runID,
        });
      return res;
    },
  });

  return {
    // Query
    workflowRunQuery,
  };
};

export default useWorkflowRun;
