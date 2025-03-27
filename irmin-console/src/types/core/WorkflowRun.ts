import { ScheduleTrigger } from '@/types/core/Schedule';
import { User } from '@/types/core/User';
import { WorkflowStatus } from '@/types/core/Workflow';

/**
 * Represents a workflow run.
 */
export interface WorkflowRun {
  /** Unique identifier of the workflow run */
  id: string;
  /** Timestamp when the workflow run was created */
  created_at: string;
  /** Timestamp when the workflow run was last updated */
  updated_at: string;
  /** Timestamp when the workflow run was started */
  started_at?: string;
  /** (optional) Timestamp when the workflow run was finished */
  finished_at?: string;
  /** Status of the workflow run */
  status: WorkflowStatus;
  /** (optional) The schedule trigger that initiated the workflow run */
  triggered_by?: ScheduleTrigger;
  /** (optional) The user who initiated the workflow run */
  triggered_by_user?: User;
  /** Identifier of the workflow */
  workflow_id: string;
  /** (optional) Logs for the workflow run */
  logs?: string[];
}
