import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { WorkflowStatus } from '@/types/core/Workflow';
import { WorkflowRun } from '@/types/core/WorkflowRun';

import { workflows } from './workflows';

/** Base properties to fake Workflow Runs for every Workflow with */
const runs: Array<{
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
  logs?: string[];
}> = [
  {
    status: WorkflowStatus.Running,
    created_at: getRandomDateTimeString(4, 'past', 1),
    updated_at: getRandomDateTimeString(4, 'past', 1),
    started_at: getRandomDateTimeString(1, 'past', 0),
    logs: ['Running step 1', 'Running step 2', 'Running step 3'],
  },
  {
    status: WorkflowStatus.Pending,
    created_at: getRandomDateTimeString(4, 'past', 1),
    updated_at: getRandomDateTimeString(4, 'past', 1),
  },
  {
    status: WorkflowStatus.Complete,
    created_at: getRandomDateTimeString(4, 'past', 1),
    updated_at: getRandomDateTimeString(4, 'past', 1),
    started_at: getRandomDateTimeString(1, 'past', 0),
    finished_at: getRandomDateTimeString(1, 'past', 0),
    logs: ['Complete step 1', 'Complete step 2', 'Complete step 3'],
  },
  {
    status: WorkflowStatus.Error,
    created_at: getRandomDateTimeString(4, 'past', 1),
    updated_at: getRandomDateTimeString(4, 'past', 1),
    started_at: getRandomDateTimeString(1, 'past', 0),
    finished_at: getRandomDateTimeString(1, 'past', 0),
    logs: ['Error step 1', 'Error step 2', 'Error step 3'],
  },
];

/**
 * Get example Workflow Runs
 *
 * Array of {@link WorkflowRun}
 */
export const workflowRuns = () => {
  const flows = workflows();

  const fullRuns: WorkflowRun[] = [];
  for (let workflowIdx = 0; workflowIdx < flows.length; workflowIdx++) {
    const workflow = flows[workflowIdx];
    const owner = workflow.owner;
    const workflowId = workflow.id;
    for (let runIdx = 0; runIdx < runs.length; runIdx++) {
      const run = runs[runIdx];
      const fullRun = {
        id: (fullRuns.length + 1).toString(),
        workflow_id: workflowId,
        owner: { ...owner },
        status: run.status,
        started_at: run.started_at,
        finished_at: run.finished_at,
        created_at: run.created_at,
        updated_at: run.updated_at,
        logs: run.logs,
      };
      fullRuns.push({ ...fullRun });
    }
  }

  return fullRuns;
};
