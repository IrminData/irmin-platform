import type { Connection } from '@/types/core/Connection';
import type { Policy } from '@/types/core/Policy';
import type { Repository } from '@/types/core/Repository';
import type { RepositoryObject } from '@/types/core/RepositoryObject';
import type { StoredQuery } from '@/types/core/StoredQuery';
import type { User } from '@/types/core/User';
import type { Workflow } from '@/types/core/Workflow';
import type { WorkflowRun } from '@/types/core/WorkflowRun';
import type { Workspace } from '@/types/core/Workspace';

/**
 * Represents the log event types.
 */
export type LogEventType =
  | 'CREATE'
  | 'DELETE'
  | 'ERROR'
  | 'INFO'
  | 'LOGIN'
  | 'LOGOUT'
  | 'UPDATE'
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
  repository_object?: RepositoryObject;
}
