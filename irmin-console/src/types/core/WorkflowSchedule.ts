/**
 * Workflow trigger type
 *
 * Represents the different trigger configurations that can activate a workflow to run.
 */
export type WorkflowTrigger =
  | TimeTrigger
  | WorkflowRunTrigger
  | RepositoryTrigger;

/**
 * Time trigger type, which represents a time-based trigger using cron syntax.
 *
 * @typeParam rrule - Recurrence Rule (rfc5545), like `RRULE:FREQ=DAILY;INTERVAL=1;`
 */
export interface TimeTrigger {
  type: 'time';
  rrule: string;
}

/**
 * Repository related events that can trigger a workflow run.
 */
export enum RepositoryEvent {
  PreCommit = 'pre-commit',
  PostCommit = 'post-commit',
  PreMerge = 'pre-merge',
  PostMerge = 'post-merge',
  PreCreateBranch = 'pre-create-branch',
  PostCreateBranch = 'post-create-branch',
  PreDeleteBranch = 'pre-delete-branch',
  PostDeleteBranch = 'post-delete-branch',
  PreCreateTag = 'pre-create-tag',
  PostCreateTag = 'post-create-tag',
  PreDeleteTag = 'pre-delete-tag',
  PostDeleteTag = 'post-delete-tag',
}

/**
 * Trigger type for repository events
 *
 * @typeParam event - The event that triggers the workflow
 * @typeParam repository - (optional) Slug of the repository that the occured event should reference
 * @typeParam ref - (option) Ref, eg. branch, tag, or commit in the repository that the occured event should reference
 */
export interface RepositoryTrigger {
  type: 'repository-event';
  event: RepositoryEvent;
  repository?: string;
  ref?: string;
}

/**
 * Workflow run related events that can trigger a new workflow run.
 */
export enum WorkflowRunEvent {
  PreWorkflowRun = 'pre-workflow-run',
  PostWorkflowRun = 'post-workflow-run',
}

/**
 * Trigger type for workflow run events
 *
 * @typeParam event - The event that triggers the workflow
 * @typeParam workflow - (optional) ID of the workflow that the occured event should reference
 */
export interface WorkflowRunTrigger {
  type: 'workflow-run-event';
  event: WorkflowRunEvent;
  workflow?: string;
}

/**
 * WorkflowSchedule type
 *
 * Represents the schedule configuration for a workflow.
 * If there are no triggers, the workflow is ran only manually.
 *
 * @typeParam triggers - List of triggers that can activate the workflow
 * @typeParam max_retries - Number of times the workflow can be retried if it fails
 * @typeParam max_runtime - Maximum runtime of the workflow in seconds
 */
export interface WorkflowSchedule {
  triggers: WorkflowTrigger[];
  max_retries?: number;
  max_runtime?: number;
  min_interval?: number;
}
