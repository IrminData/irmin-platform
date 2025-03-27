import {
  RepositoryEvent,
  WorkflowRunEvent,
  WorkflowSchedule,
} from '@/types/core/Schedule';

/**
 * Example workflow schedules with merged triggers and configurations
 */
export const workflowSchedules: WorkflowSchedule[] = [
  // Daily and post-commit trigger for the main branch
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=DAILY;INTERVAL=1;' },
      {
        type: 'repository-event',
        event: RepositoryEvent.PostCommit,
        repository: 'app-data',
        ref: 'main',
      },
    ],
    max_retries: 3,
    max_runtime: 3600,
  },
  // Weekly on Mondays and workflow run trigger after another workflow completes
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO;' },
      {
        type: 'workflow-run-event',
        event: WorkflowRunEvent.PostWorkflowRun,
        workflow: '4',
      },
    ],
    max_retries: 2,
    max_runtime: 1800,
  },
  // Post-merge event and time trigger every 5 minutes
  {
    triggers: [
      {
        type: 'repository-event',
        event: RepositoryEvent.PostMerge,
        repository: 'app-data',
      },
      { type: 'time', rrule: 'RRULE:FREQ=MINUTELY;INTERVAL=5;' },
    ],
    max_retries: 4,
    max_runtime: 300,
  },
  // Daily, post-commit, and pre-workflow run triggers
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=DAILY;BYHOUR=9;' },
      {
        type: 'repository-event',
        event: RepositoryEvent.PostCommit,
        repository: 'app-data',
        ref: 'staging',
      },
      {
        type: 'workflow-run-event',
        event: WorkflowRunEvent.PreWorkflowRun,
        workflow: '2',
      },
    ],
    max_retries: 5,
    max_runtime: 3600,
  },
  // Pre-create branch and post-create tag for a specific repository
  {
    triggers: [
      {
        type: 'repository-event',
        event: RepositoryEvent.PreCreateBranch,
        repository: 'main-google-analytics',
        ref: 'main',
      },
      {
        type: 'repository-event',
        event: RepositoryEvent.PostCreateTag,
        repository: 'main-google-analytics',
      },
    ],
    max_runtime: 900,
  },
  // Monthly and post-delete branch for a specific repository
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;' },
      {
        type: 'repository-event',
        event: RepositoryEvent.PostDeleteBranch,
        repository: 'app-data',
      },
    ],
    max_runtime: 3600,
  },
  // Bi-weekly on Mondays and pre-merge event
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;' },
      {
        type: 'repository-event',
        event: RepositoryEvent.PreMerge,
        repository: 'app-data',
      },
    ],
    max_retries: 2,
    max_runtime: 2400,
  },
  // Quarterly, post-create branch, and pre-delete tag
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=YEARLY;BYMONTH=1,4,7,10;' },
      {
        type: 'repository-event',
        event: RepositoryEvent.PostCreateBranch,
        repository: 'app-data',
      },
      { type: 'repository-event', event: RepositoryEvent.PreDeleteTag },
    ],
    max_runtime: 3600,
    min_interval: 86400,
  },
  // Hourly, pre-create tag, and post-workflow run
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=HOURLY;' },
      { type: 'repository-event', event: RepositoryEvent.PreCreateTag },
      {
        type: 'workflow-run-event',
        event: WorkflowRunEvent.PostWorkflowRun,
        workflow: '2',
      },
    ],
    max_retries: 3,
  },
  // Yearly and pre-workflow run triggers for manual execution
  {
    triggers: [
      { type: 'time', rrule: 'RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1;' },
      {
        type: 'workflow-run-event',
        event: WorkflowRunEvent.PreWorkflowRun,
      },
    ],
    max_runtime: 1800,
    max_retries: 1,
  },
];
