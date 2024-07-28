import { Connector } from '@/types/api/Connector';
import { Dataset } from '@/types/api/Dataset';

/**
 * Types of workflows that can be created
 * Source app/Enums/WorkflowType.php
 */
type WorkflowableType = 'connection' | 'action' | 'export';

/**
 * Workflow type
 * @typeParam id - Workflow ID
 * @typeParam workflowable_type - Type of workflow
 * @typeParam workflowable_id - ID of the workflowable
 * @typeParam workflowable - The workflowable object
 * @typeParam cron_syntax - Cron syntax for the workflow
 * @typeParam next_run_at - Timestamp of the next run of the workflow
 * @typeParam status - Status of the workflow
 * @typeParam created_at - Workflow creation date
 * @typeParam updated_at - Workflow update date
 * @typeParam name - Workflow name
 * @typeParam description - Workflow description
 * @typeParam documentation - Workflow documentation as a markdown string
 * @typeParam result - Dataset that is the result of the workflow.  If a workspace results in data, it should be wrapped as a Dataset. Not relevant for Export Workflows.
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface Workflow {
  id: number;
  workflowable_type: WorkflowableType;
  workflowable_id: number;
  workflowable: Connection | Action | ExportSync;
  cron_syntax?: string;
  next_run_at?: string;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  name: string;
  description?: string;
  documentation?: string;
  result?: Dataset;
}

/**
 * Workflow of type Connection
 */
export type ConnectionWorkflow = Workflow & { workflowable: Connection };
/**
 * Workflow of type Export
 */
export type ExportWorkflow = Workflow & { workflowable: ExportSync };
/**
 * Workflow of type Action
 */
export type ActionWorkflow = Workflow & { workflowable: Action };

/**
 * Workflow run type, single execution of a workflow
 * @typeParam id - Workflow run ID
 * @typeParam workflow_id - ID of the workflow that was run
 * @typeParam status - Status of the workflow run
 * @typeParam started_at - Timestamp of when the workflow run started
 * @typeParam finished_at - Timestamp of when the workflow run finished
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface WorkflowRun {
  id: number;
  workflow_id: number;
  status: WorkflowStatus;
  started_at: string;
  finished_at?: string;
}

/**
 * Workflow status options
 * Source: app/Enums/WorkflowStatus.php
 */
export type WorkflowStatus =
  | 'paused'
  | 'pending'
  | 'initiating'
  | 'running'
  | 'complete'
  | 'error';

/**
 * Connection workflow Workflowable object
 * @typeParam details - String which contains a JSON object
 * @typeParam settings - String which contains a JSON object
 * @typeParam connector - Connector object
 */
interface Connection {
  details: string;
  settings: string;
  connector: Connector;
}

/**
 * Export workflow Workflowable object
 * @typeParam destination - Connection object of where to export the data
 * @typeParam source - Dataset object of what to export
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
interface ExportSync {
  destination: Connection;
  source: Dataset;
}

/**
 * Action workflow Workflowable object
 * @typeParam path - Path to the action
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
interface Action {
  path: string;
}
