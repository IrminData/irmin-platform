import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { WorkflowRun } from '@/types/api/Workflow';

import { workflows } from './workflows';

/** Base properties to fake Workflow Runs for every Workflow with */
const runs: Array<{
  status: string;
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
export const workflowRuns: () => WorkflowRun[] = () =>
  workflows().flatMap((workflow, workflowIdx) =>
    runs.map((run, runIdx) => {
      const baseRun = {
        id: workflowIdx * runs.length + runIdx, // Fake unique ID
        workflow_id: workflow.id,
        owner: workflow.owner,
        status: run.status,
        started_at: run.started_at,
      };

      if (run.finished_at) {
        return { ...baseRun, finished_at: run.finished_at } as WorkflowRun;
      }

      return baseRun as WorkflowRun;
    })
  );
