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
 */
export interface LogEvent {
  /** Unique identifier of the event */
  id: string;
  /** Type of the activity (e.g., CREATE, UPDATE, DELETE, etc.) */
  type: LogEventType;
  /** Timestamp of the event */
  timestamp: string;
  /** Description of the event */
  description: string;
  /** Optional. ID of the subject object of the event */
  subject_id?: string;
  /** Optional. Type of the subject object of the event */
  subject_type?: 'repository' | 'workflow' | 'connection';
  /** Optional. User who is responsible for the event. Leave empty if system. */
  user?: User;
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
