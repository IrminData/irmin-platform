import { User } from '@/types/core/User';

import { WorkflowSchedule } from './Schedule';

/**
 * Types of workflows that can exist
 */
export type WorkflowableType = 'import' | 'action' | 'export' | 'pipeline';

/**
 * Base Workflow object that all workflows extend
 */
interface WorkflowBase {
  /** Workflow hash ID */
  id: string;
  /** Workflow name */
  name: string;
  /** Workflow description */
  description: string;
  /** Workflow documentation as a markdown string */
  documentation: string;
  /** Status of the workflow */
  status: WorkflowStatus;
  /** Type of the workflow */
  type: WorkflowableType;
  /** The workspace user that owns this workflow and is responsible for it */
  owner: User;
  /** (optional) Schedule configuration for the workflow (eg. triggers, max retries, max runtime) */
  schedule?: WorkflowSchedule;
  /** Workflow type specific configurations */
  workflowable?: Import | Export | Action | Pipeline;
}

/**
 * Workflow of type Import
 */
export type ImportWorkflow = WorkflowBase & {
  type: 'import';
  workflowable: Import;
};

/**
 * Workflow of type Export
 */
export type ExportWorkflow = WorkflowBase & {
  type: 'export';
  workflowable: Export;
};

/**
 * Workflow of type Action
 */
export type ActionWorkflow = WorkflowBase & {
  type: 'action';
  workflowable: Action;
};

/**
 * Workflow of type Pipeline
 */
export type PipelineWorkflow = WorkflowBase & {
  type: 'pipeline';
  workflowable: Pipeline;
};

/**
 * Workflow object
 */
export type Workflow =
  | ImportWorkflow
  | ExportWorkflow
  | ActionWorkflow
  | PipelineWorkflow;

/**
 * Workflow status options
 */
export enum WorkflowStatus {
  Empty = '',
  Paused = 'paused',
  Pending = 'pending',
  Initiating = 'initiating',
  Running = 'running',
  Complete = 'complete',
  Error = 'error',
}

/**
 * Import object - workflowable for the Workflow
 */
export interface Import {
  type: 'import';
  /** Source connection sqid */
  connection_id: string;
  /** Path within the connection's schema to fetch data from */
  connection_path: string;
  /**  Slug of the destination repository */
  repository: string;
  /** Destination branch in the repository */
  branch: string;
  /** Path within the repository to store the imported data */
  path: string;
}

/**
 * Export object - workflowable for the Workflow
 */
export interface Export {
  type: 'export';
  /** Destination connection sqid */
  connection_id: string;
  /** Path within the connection's schema to export data to */
  connection_path: string;
  /** Slug of the repository to export data from */
  repository: string;
  /** Source branch in the repository */
  branch: string;
  /** Path within the repository to export data from */
  path: string;
}

/**
 * Action input data object
 */
export interface ActionInputData {
  /** Slug of the repository */
  repository: string;
  /** Ref in the repository */
  ref: string;
  /** Path within the repository */
  path: string;
}

/**
 * Action object - workflowable for the Workflow
 */
export interface Action {
  type: 'action';
  /** Path to the script to execute */
  executable: string;
  /** Input data repositories, refs and paths */
  input?: ActionInputData[];
  /** Slug of the repository to store the results */
  repository?: string;
  /** Branch in the repository for results */
  branch?: string;
  /** Path within the repository for results */
  path?: string;
}

/**
 * Pipeline Workflow configuration
 */
export interface Pipeline {
  type: 'pipeline';
  /** Whether the pipeline runs continuously or follows a Workflow Schedule */
  live: boolean;
  /** Chain of thins, in order, to pass the data through */
  stages: PipelineStage[];
}

/**
 * One stage of a Pipeline
 */
export type PipelineStage = {
  /** Explanation as to what this stage is responsible for */
  description: string;
  /** Whether the input of the stage should be used */
  write: boolean;
  /** Whether the result of the stage should be passed to the next stage */
  read: boolean;
} & (PipelineStageAction | PipelineStageConnection | PipelineStageRepository);

/**
 * Pipeline Stage that executes an action
 */
export interface PipelineStageAction {
  type: 'action';
  /** Path to the Action Script to be executed */
  executable: string;
}

/**
 * Pipeline Stage that uses a connection
 */
export interface PipelineStageConnection {
  type: 'connection';
  /** Connection to use */
  connection_id: string;
  /** Path to write within the connection */
  connection_write_path: string;
  /** Path to read within the connection */
  connection_read_path: string;
}

/**
 * Pipeline Stage that uses a repository
 */
export interface PipelineStageRepository {
  type: 'repository';
  /** Slug of the repository to use */
  repository: string;
  /** Branch in the repository */
  branch: string;
  /** Path within the repository */
  path: string;
}
