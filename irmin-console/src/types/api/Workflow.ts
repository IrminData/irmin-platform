import { Connection } from '@/types/api/Connection';
import { Repository } from '@/types/api/Repository';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * Types of workflows that can be created
 * Source app/Enums/WorkflowType.php
 */
export type WorkflowableType = 'import' | 'action' | 'export';

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
 * @typeParam created_at - Workflow creation date
 * @typeParam updated_at - Workflow update date
 */
export interface Workflow {
  id: number;
  name: string;
  slug: string;
  owner: WorkspaceUser;
  workflowable_type: WorkflowableType;
  workflowable: Import | Action | Export;
  cron_syntax: string | null;
  last_run_at?: string | null;
  next_run_at?: string | null;
  status: WorkflowStatus;
  description: string;
  documentation: string;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow of type Import
 */
export type ImportWorkflow = Workflow & { workflowable: Import };
/**
 * Workflow of type Export
 */
export type ExportWorkflow = Workflow & { workflowable: Export };
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
 * Import object - workflowable for the Workflow
 *
 * @typeParam connection - Connection object of where to import from
 * @typeParam repository - Repository object of where to store the imported data
 * @typeParam path - Where in the repository to store the imported data
 */
interface Import {
  connection: Connection;
  repository: Repository;
  path: '/';
}

/**
 * Export object - workflowable for the Workflow
 *
 * @typeParam connection - Export destination, Connection object of where to export to
 * @typeParam repository - Repository object of what to export
 * @typeParam path - What in the repository to export
 * @typeParam recursive - If the export should be recursive
 */
interface Export {
  connection: Connection;
  repository: Repository;
  path: '/';
  recursive: false;
}

/**
 * Action object - workflowable for the Workflow
 *
 * @typeParam path - Path to the script file to be executed as an action workflow
 */
interface Action {
  path: string;
}
