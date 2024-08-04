import { Connector } from '@/types/api/Connector';
import { DataRepo } from '@/types/api/DataRepo';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * Types of workflows that can be created
 * Source app/Enums/WorkflowType.php
 */
type WorkflowableType = 'connection' | 'action' | 'export';

/**
 * Workflow type
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 *
 * @typeParam id - Workflow ID
 * @typeParam name - Workflow name
 * @typeParam owner - The workspace user that owns this workflow and is responsible for it
 * @typeParam workflowable_type - Type of workflow
 * @typeParam workflowable_id - ID of the workflowable
 * @typeParam workflowable - The workflowable object
 * @typeParam cron_syntax - Cron syntax for the workflow
 * @typeParam next_run_at - Timestamp of the next run of the workflow
 * @typeParam status - Status of the workflow
 * @typeParam description - Workflow description
 * @typeParam documentation - Workflow documentation as a markdown string
 * @typeParam result - DataRepo that is the result of the workflow. If a workspace results in data, it will be grouped as a DataRepo.
 * @typeParam created_at - Workflow creation date
 * @typeParam updated_at - Workflow update date
 */
export interface Workflow {
  id: number;
  name: string;
  owner: WorkspaceUser;
  workflowable_type: WorkflowableType;
  workflowable_id: number;
  workflowable: Connection | Action | ExportSync;
  cron_syntax?: string | null;
  next_run_at?: string | null;
  status: WorkflowStatus;
  description?: string | null;
  documentation?: string | null;
  result?: DataRepo | null;
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
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
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
 * Connection workflow Workflowable object
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
 * Export workflow Workflowable object
 *
 * @typeParam destination - Connection Workflow object of where to export
 * @typeParam source - Data Repository object of what to export
 */
interface ExportSync {
  destination: ConnectionWorkflow;
  source: DataRepo;
}

/**
 * Action workflow Workflowable object
 *
 * @typeParam path - Path to the action
 */
interface Action {
  path: string;
}
