import type { Tag } from '@/types/core/Tag';
import type { User } from '@/types/core/User';

import type { ObjectSchema } from './ObjectSchema';
import type { WorkflowSchedule } from './Schedule';

/**
 * Field mapping object
 */
export interface FieldMapping {
  /** Source file path */
  source_path: string;
  /** Field name in the source file */
  source_field?: string;
  /** Destination file path */
  destination_path: string;
  /** Field name in the destination file */
  destination_field?: string;
}

/**
 * Types of workflows that can exist
 */
export type WorkflowableType = 'action' | 'export' | 'import' | 'pipeline';

/**
 * Executable workflowable object
 */
export type Workflowable = Action | Export | Import | Pipeline;

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
  /** Tags associated with this workflow */
  tags?: Tag[];
  /** (optional) Schedule configuration for the workflow (eg. triggers, max retries, max runtime) */
  schedule?: WorkflowSchedule;
  /** Workflow type specific configurations */
  workflowable?: Workflowable;
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
  | ActionWorkflow
  | ExportWorkflow
  | ImportWorkflow
  | PipelineWorkflow;

/**
 * Workflow status options
 */
export type WorkflowStatus =
  | ''
  | 'paused'
  | 'pending'
  | 'initiating'
  | 'running'
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * Import object - workflowable for the Workflow
 */
export interface Import {
  type: 'import';
  /** Source connection sqid */
  connection_id: string;
  /** Paths within the connection's schema to fetch data from */
  import_from_connection_paths: string[];
  /**  Slug of the destination repository */
  repository: string;
  /** Destination branch in the repository */
  repository_branch: string;
  /** Paths within the repository to store the imported data */
  import_to_repository_path: string;
  /** Field mappings for the import */
  field_mappings?: FieldMapping[];
}

/**
 * Export object - workflowable for the Workflow
 */
export interface Export {
  type: 'export';
  /** Destination connection sqid */
  connection_id: string;
  /** Paths within the connection's schema to export data to */
  export_from_repository_paths: string[];
  /** Slug of the repository to export data from */
  repository: string;
  /** Source branch in the repository */
  repository_branch: string;
  /** Paths within the repository to export data from */
  export_to_connection_path: string;
  /** Field mappings for the export */
  field_mappings?: FieldMapping[];
}

/**
 * Action input data object
 */
export interface ActionInputData {
  /** Slug of the repository */
  repository: string;
  /** Ref in the repository */
  repository_ref: string;
  /** Path within the repository */
  repository_path: string;
}

/**
 * Action object - workflowable for the Workflow
 */
export interface Action {
  type: 'action';
  /** Executable type */
  executable_type?: 'script' | 'query';
  /** Script ID to execute */
  script_id?: string;
  /** Query ID to execute */
  query_id?: string;
  /** Input data repositories, refs and paths */
  input?: ActionInputData[];
  /** Slug of the repository to store the results */
  results_repository?: string;
  /** Branch in the repository for results */
  results_repository_branch?: string;
  /** Path within the repository for results */
  results_repository_path?: string;
}

/**
 * Pipeline Workflow configuration
 */
export interface Pipeline {
  type: 'pipeline';
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
  /** The order of the stage in the pipeline */
  order_sequence: number;
} & (
  | PipelineStageAction
  | PipelineStageConnection
  | PipelineStageRepository
  | PipelineStageRepositoryAction
  | PipelineStageTriggerWorkflow
  | PipelineStageValidation
);

/**
 * Pipeline Stage that executes an action
 */
interface PipelineStageAction {
  type: 'action';
  /** Executable type */
  executable_type: 'script' | 'query';
  /** Script ID to be executed */
  script_id?: string;
  /** Query ID to be executed */
  query_id?: string;
}

/**
 * Pipeline Stage that uses a connection
 */
interface PipelineStageConnection {
  type: 'connection';
  /** Connection to use */
  connection_id: string;
  /** Path to write within the connection */
  connection_write_path: string;
  /** Paths to read within the connection */
  connection_read_paths: string[];
}

/**
 * Pipeline Stage that uses a repository
 */
interface PipelineStageRepository {
  type: 'repository';
  /** Slug of the repository to use */
  repository: string;
  /** Branch in the repository */
  repository_branch: string;
  /** Path to write within the repository */
  repository_write_path: string;
  /** Path to read within the repository */
  repository_read_paths: string[];
}

/**
 * Pipeline Stage that performs a repository action (commit, merge, revert)
 */
interface PipelineStageRepositoryAction {
  type: 'repository_action';
  /** Type of repository action */
  repository_action_type: 'commit' | 'merge' | 'revert';
  /** Slug of the repository to use */
  repository_action_repository: string;
  /** Branch in the repository */
  repository_action_branch: string;
  /** Target branch (for merge) */
  repository_action_target_branch?: string;
  /** Commit message (for commit and merge) */
  repository_action_commit_message?: string;
  /** Path to revert (for revert) */
  repository_action_revert_path?: string;
  /** Merge strategy (for merge) */
  repository_action_merge_strategy?: string;
  /** Whether to squash commits (for merge) */
  repository_action_squash?: boolean;
  /** Whether to allow empty commits (for merge) */
  repository_action_allow_empty?: boolean;
}

/**
 * Pipeline Stage that triggers another workflow
 */
interface PipelineStageTriggerWorkflow {
  type: 'trigger_workflow';
  /** ID of the workflow to trigger */
  trigger_workflow_id: string;
}

/**
 * Pipeline Stage that validates data against a schema
 */
interface PipelineStageValidation {
  type: 'validation';
  /** Schema to validate against */
  validation_schema: ObjectSchema;
  /** Validation mode: single file or all files. Defaults to 'all' if not specified. */
  validation_mode?: 'single' | 'all';
  /** Whether to fail pipeline on validation error. Defaults to true if not specified. */
  fail_on_error?: boolean;
  /** Optional: specific file name to validate (for single mode) */
  validation_target_name?: string;
}
