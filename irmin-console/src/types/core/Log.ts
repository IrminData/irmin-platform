import { User } from '@/types/core/User';

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
 * @typeParam workflow - Optional. Slug of the workflow associated with the event
 */
export interface LogEvent {
  id: string;
  type: LogEventType;
  timestamp: string;
  description: string;
  user?: User;
  workflow?: string;
}

/**
 * Workflow run logs.
 *
 * Log feed as a text to be rendered in the UI.
 *
 * @typeParam logs - Logs of the workflow run
 */
export type WorkflowRunLogs = {
  logs: string[];
};
