/**
 * Workflow trigger type
 *
 * Represents the different trigger configurations that can activate a workflow to run.
 */
export type ScheduleTrigger =
  RepositoryTrigger | TimeTrigger | WorkflowRunTrigger | ConnectionEventTrigger;

/**
 * Time trigger type, which represents a time-based trigger using cron syntax.
 */
export interface TimeTrigger {
  type: 'time';
  /** Recurrence Rule (rfc5545), like `RRULE:FREQ=DAILY;INTERVAL=1;`*/
  rrule?: string;
  /** Cron expression, like `0 0 * * *` */
  cron?: string;
}

/**
 * Repository related events that can trigger a workflow run.
 */
export type RepositoryEvent =
  | 'pre-commit'
  | 'post-commit'
  | 'pre-merge'
  | 'post-merge'
  | 'pre-create-branch'
  | 'post-create-branch'
  | 'pre-delete-branch'
  | 'post-delete-branch'
  | 'pre-create-tag'
  | 'post-create-tag'
  | 'pre-delete-tag'
  | 'post-delete-tag';

/**
 * Trigger type for repository events
 */
export interface RepositoryTrigger {
  /** The event that triggers the workflow */
  event: RepositoryEvent;
  /** (optional) Slug of the repository that the occurred event should reference */
  repository?: string;
  /** (optional) Ref, eg. branch, tag, or commit in the repository that the occurred event should reference */
  ref?: string;
  type: 'repository-event';
}

/**
 * Workflow run related events that can trigger a new workflow run.
 */
export type WorkflowRunEvent = 'pre-workflow-run' | 'post-workflow-run';

/**
 * Trigger type for workflow run events
 */
export interface WorkflowRunTrigger {
  /** The event that triggers the workflow */
  event: WorkflowRunEvent;
  /** (optional) ID of the workflow that the occurred event should reference */
  workflow?: string;
  type: 'workflow-run-event';
}

/**
 * Connection related events that can trigger a workflow run.
 */
export type ConnectionEvent = 'insert' | 'update' | 'delete' | 'upsert';

/**
 * Trigger type for connection events (data changes in external systems)
 */
export interface ConnectionEventTrigger {
  /** The event type that triggers the workflow */
  event?: ConnectionEvent;
  /** ID of the connection that the event should come from */
  connection?: string;
  /** (optional) List of paths to filter events (e.g., ["leads", "contacts"]) */
  connection_paths?: string[];
  type: 'connection-event';
}

/**
 * WorkflowSchedule type
 *
 * Represents the schedule configuration for a workflow.
 * If there are no triggers, the workflow is ran only manually.
 */
export interface WorkflowSchedule {
  /** List of triggers that can activate the workflow */
  triggers?: ScheduleTrigger[] | null;
  /** Number of times the workflow can be retried if it fails */
  max_retries?: number;
  /** Maximum runtime of the workflow in seconds */
  max_runtime?: number;
  /** Minimum interval between workflow runs in seconds */
  min_interval?: number;
}
