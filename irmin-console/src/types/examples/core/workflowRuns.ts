import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { WorkflowRun, WorkflowStatus } from '@/types/api/Workflow';

import { workflows } from './workflows';

/** Base properties to fake Workflow Runs for every Workflow with */
const runs: Array<{
  status: WorkflowStatus;
  started_at: string;
  finished_at?: string;
}> = [
  {
    status: 'running',
    started_at: getRandomDateTimeString(2, 'past', 0),
  },
  {
    status: 'complete',
    started_at: getRandomDateTimeString(2, 'past', 0),
    finished_at: getRandomDateTimeString(1, 'past', 0),
  },
  {
    status: 'error',
    started_at: getRandomDateTimeString(2, 'past', 0),
    finished_at: getRandomDateTimeString(1, 'past', 0),
  },
  {
    status: 'pending',
    started_at: getRandomDateTimeString(2, 'past', 0),
  },
  {
    status: 'paused',
    started_at: getRandomDateTimeString(2, 'past', 0),
  },
  {
    status: 'initiating',
    started_at: getRandomDateTimeString(1, 'past', 0),
  },
  {
    status: 'complete',
    started_at: getRandomDateTimeString(2, 'past', 1),
    finished_at: getRandomDateTimeString(1, 'past', 0),
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
        id: fullRuns.length + 1,
        workflow_id: workflowId,
        owner: { ...owner },
        status: run.status,
        started_at: run.started_at,
      };
      if (run.finished_at) {
        fullRuns.push({
          ...fullRun,
          finished_at: run.finished_at,
        });
      } else {
        fullRuns.push({ ...fullRun });
      }
    }
  }

  return fullRuns;
};
