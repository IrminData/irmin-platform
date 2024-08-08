import { Connector } from '@/types/api/Connector';
import { Repository } from '@/types/api/Repository';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * Types of workflows that can be created
 * Source app/Enums/WorkflowType.php
 */
type WorkflowableType = 'connection' | 'action' | 'export';

/**
 * Workflow type
 *
 * @typeParam id - Workflow ID
 * @typeParam name - Workflow name
 * @typeParam owner - The workspace user that owns this workflow and is responsible for it
 * @typeParam workflowable_type - Type of workflow
 * @typeParam workflowable - Object with details for the workflow, specific to the workflowable type
 * @typeParam cron_syntax - Cron syntax for the workflow
 * @typeParam last_run_at - Timestamp of the last run of the workflow
 * @typeParam next_run_at - Timestamp of the next run of the workflow
 * @typeParam status - Status of the workflow
 * @typeParam description - Workflow description
 * @typeParam documentation - Workflow documentation as a markdown string
 * @typeParam repository - Result of the workflow. If a workspace results in data, it will be grouped as a Repository.
 * @typeParam created_at - Workflow creation date
 * @typeParam updated_at - Workflow update date
 */
export interface Workflow {
  id: number;
  name: string;
  slug: string;
  owner: WorkspaceUser;
  workflowable_type: WorkflowableType;
  workflowable: Connection | Action | ExportSync;
  cron_syntax: string | null;
  last_run_at?: string | null;
  next_run_at?: string | null;
  status: WorkflowStatus;
  description: string;
  documentation: string;
  repository?: Repository | null;
  created_at: string;
  updated_at: string;
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
 *
 * @typeParam id - Workflow run ID
 * @typeParam workflow_id - ID of the workflow that was run
 * @typeParam owner - The workspace user that is response for this workflow run. Essentialy the owner of the workflow that was run, at the time of the run.
 * @typeParam status - Status of the workflow run
 * @typeParam started_at - Timestamp of when the workflow run started
 * @typeParam finished_at - Timestamp of when the workflow run finished
 */
export interface WorkflowRun {
  id: number;
  workflow_id: number;
  owner: WorkspaceUser;
  status: WorkflowStatus;
  started_at: string;
  finished_at?: string;
}

/**
 * Workflow status options
 * Source in the API: `app/Enums/WorkflowStatus.php`
 */
export type WorkflowStatus =
  | 'paused'
  | 'pending'
  | 'initiating'
  | 'running'
  | 'complete'
  | 'error';

/**
 * Connection object - workflowable for the Workflow
 *
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
 * Export object - workflowable for the Workflow
 *
 * @typeParam destination - Connection Workflow object of where to export
 * @typeParam source - Repository object of what to export
 */
interface ExportSync {
  destination: ConnectionWorkflow;
  source: Repository;
}

/**
 * Action object - workflowable for the Workflow
 *
 * @typeParam path - Path to the action
 */
interface Action {
  path: string;
}
