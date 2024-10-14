import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { User } from '@/types/core/User';

import { WorkflowSchedule } from './WorkflowSchedule';

/**
 * Types of workflows that can be created
 * Source app/Enums/WorkflowType.php
 */
export type WorkflowableType = 'import' | 'action' | 'export';

/**
 * Workflow object
 *
 * @typeParam id - Workflow hash ID
 * @typeParam name - Workflow name
 * @typeParam owner - The workspace user that owns this workflow and is responsible for it
 * @typeParam workflowable_type - Type of workflow
 * @typeParam workflowable - Object with details for the workflow, specific to the workflowable type
 * @typeParam schedule - (optional) Schedule configuration for the workflow (eg. triggers, max retries, max runtime) - empty if ran manually
 * @typeParam status - Status of the workflow
 * @typeParam description - Workflow description
 * @typeParam documentation - Workflow documentation as a markdown string
 * @typeParam created_at - Workflow creation date
 * @typeParam updated_at - Workflow update date
 */
export interface Workflow {
  id: string;
  name: string;
  owner: User;
  workflowable_type: WorkflowableType;
  workflowable: Import | Action | Export;
  schedule?: WorkflowSchedule;
  status: WorkflowStatus;
  description: string;
  documentation: string;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow of type Import
 */
export type ImportWorkflow = Workflow & {
  workflowable: Import;
  workflowable_type: 'import';
};
/**
 * Workflow of type Export
 */
export type ExportWorkflow = Workflow & {
  workflowable: Export;
  workflowable_type: 'export';
};
/**
 * Workflow of type Action
 */
export type ActionWorkflow = Workflow & {
  workflowable: Action;
  workflowable_type: 'action';
};

/**
 * Workflow run object. eg. Single execution of a Workflow
 *
 * @typeParam id - Workflow run ID
 * @typeParam workflow_id - ID of the workflow that was run
 * @typeParam owner - The workspace user that is response for this workflow run. Essentialy the owner of the workflow that was run, at the time of the run.
 * @typeParam status - Status of the workflow run
 * @typeParam started_at - Timestamp of when the workflow run started
 * @typeParam finished_at - Timestamp of when the workflow run finished
 */
export interface WorkflowRun {
  id: string;
  workflow_id: string;
  owner: User;
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
 * @typeParam branch - Branch to import to
 * @typeParam path - Where in the repository to store the imported data
 */
export interface Import {
  connection: Connection;
  repository: Repository;
  branch: string;
  path: string;
}

/**
 * Export object - workflowable for the Workflow
 *
 * @typeParam connection - Export destination, Connection object of where to export to
 * @typeParam repository - Repository object of what to export
 * @typeParam branch - Branch to export from
 * @typeParam path - What in the repository to export
 * @typeParam recursive - If the export should be recursive
 */
export interface Export {
  connection: Connection;
  repository: Repository;
  branch: string;
  path: string;
  recursive: false;
}

/**
 * Action object - workflowable for the Workflow
 *
 * @typeParam executable - Path to the script file to be executed as an action workflow
 * @typeParam repository - (optional) Repository object of where the action results will be stored
 * @typeParam branch - (optional) Repository branch to store the action results in
 * @typeParam path - (optional) Path in the repository to store the action results
 */
export interface Action {
  executable: string;
  repository?: Repository;
  branch?: string;
  path?: string;
}
