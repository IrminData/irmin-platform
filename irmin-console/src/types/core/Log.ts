import { Connection } from '@/types/core/Connection';
import { Object } from '@/types/core/Object';
import { Policy } from '@/types/core/Policy';
import { Repository } from '@/types/core/Repository';
import { StoredQuery } from '@/types/core/StoredQuery';
import { User } from '@/types/core/User';
import { Workflow } from '@/types/core/Workflow';
import { WorkflowRun } from '@/types/core/WorkflowRun';
import { Workspace } from '@/types/core/Workspace';

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
  /** (optional) Workspace associated with the log event */
  workspace?: Workspace;
  /** (optional) User associated with the log event */
  user?: User;
  /** (optional) Workflow run associated with the log event */
  workflow_run?: WorkflowRun;
  /** (optional) Workflow associated with the log event */
  workflow?: Workflow;
  /** (optional) Repository associated with the log event */
  repository?: Repository;
  /** (optional) Connection associated with the log event */
  connection?: Connection;
  /** (optional) Stored query associated with the log event */
  stored_query?: StoredQuery;
  /** (optional) Policy associated with the log event */
  policy?: Policy;
  /** (optional) Repository object associated with the log event */
  repository_object?: Object;
}
