import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
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
  /** Source connection */
  connection: Connection;
  /** Path within the connection's schema to fetch data from */
  connection_path: string;
  /**  Destination repository in Irmin */
  repository: Repository;
  /** Destination branch in the repository */
  branch: string;
  /** Path within the repository to store the imported data */
  path: string;
}

/**
 * Export object - workflowable for the Workflow
 */
export interface Export {
  /** Destination connection */
  connection: Connection;
  /** Path within the connection's schema to export data to */
  connection_path: string;
  /** Source repository in Irmin */
  repository: Repository;
  /** Source branch in the repository */
  branch: string;
  /** Path within the repository to export data from */
  path: string;
  /** Determines if the export should be recursive */
  recursive: boolean;
}

/**
 * Action object - workflowable for the Workflow
 */
export interface Action {
  /** Path to the script to execute */
  executable: string;
  /** Repository to store action results */
  repository?: Repository;
  /** Branch in the repository for results */
  branch?: string;
  /** Path within the repository for results */
  path?: string;
}

/**
 * Pipeline Workflow configuration
 */
export interface Pipeline {
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
  connection: Connection;
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
  /** Repository to use */
  repository: Repository;
  /** Branch in the repository */
  branch: string;
  /** Path within the repository */
  path: string;
}
