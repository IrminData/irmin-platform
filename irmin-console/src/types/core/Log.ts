import { Repository } from '@/types/core/Repository';
import { User } from '@/types/core/User';
import { Workflow, WorkflowRun } from '@/types/core/Workflow';

/**
 * Represents the log event types.
 */
export type LogEventType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ERROR'
  | 'INFO'
  | 'WARNING';

/**
 * Represents a log event.
 */
export interface LogEvent {
  /** Unique identifier of the log event */
  id: string;
  /** Type of the log event */
  type: LogEventType;
  /** Description of the log event */
  description: string;
  /** Timestamp when the log event was created */
  created_at: string;
  /** (optional) User associated with the log event */
  user?: User;
  /** (optional) Workflow run associated with the log event */
  workflow_run?: WorkflowRun;
  /** (optional) Workflow associated with the log event */
  workflow?: Workflow;
  /** (optional) Repository associated with the log event */
  repository?: Repository;
}
