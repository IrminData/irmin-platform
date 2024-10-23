import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { User } from '@/types/core/User';
import { Workflow, WorkflowRun } from '@/types/core/Workflow';

/**
 * Enum for the types of log events.
 */
export enum LogEventType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ERROR = 'ERROR',
  INFO = 'INFO',
  WARNING = 'WARNING',
}

/**
 * Interface for the details of a log event.
 *
 * @typeParam id - Unique identifier of the event
 * @typeParam type - Type of the activity (e.g., CREATE, UPDATE, DELETE, etc.)
 * @typeParam timestamp - Timestamp of the event
 * @typeParam description - Description of the event
 * @typeParam user - Optional. User who is responsible for the event. Leave empty if system.
 */
export interface LogEvent {
  id: string;
  type: LogEventType;
  timestamp: string;
  description: string;
  user?: User;
}

/**
 * Workflow log event type
 */
export interface WorkflowLogEvent extends LogEvent {
  workflow: Workflow;
}

/**
 * Repository log event type
 */
export interface RepositoryLogEvent extends LogEvent {
  repository: Repository;
}

/**
 * Connection log event type
 */
export interface ConnectionLogEvent extends LogEvent {
  connection: Connection;
}

/**
 * Workflow run logs.
 *
 * Log feed as a text to be rendered in the UI.
 */
export type WorkflowRunLogs = {
  workflowRun: WorkflowRun;
  workflow: Workflow;
  logs: string[];
};
