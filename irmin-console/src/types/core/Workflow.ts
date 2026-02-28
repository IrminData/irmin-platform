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
  /** DuckDB type to cast the field to (e.g., VARCHAR, INTEGER, BIGINT, DOUBLE, BOOLEAN, TIMESTAMP, DATE) */
  cast_type?: string;
  /** JSON dot-notation path for unwrapping nested data (e.g., "data" for { data: [...] }) */
  source_json_path?: string;
}

/**
 * Transform operation types
 */
type TransformOperationType =
  | 'field_rename'
  | 'field_remove'
  | 'file_rename'
  | 'file_remove'
  | 'format_convert';

/**
 * Output format options for format conversion
 */
type OutputFormat = 'csv' | 'json' | 'parquet';

/**
 * Field rename mapping (old name to new name)
 */
interface FieldRename {
  /** Original field name */
  old_name: string;
  /** New field name */
  new_name: string;
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
 * Sync mode for import/export workflows
 * - 'full': Always perform full data sync
 * - 'patch': Only accept patch-based events (requires event trigger)
 * - 'auto': Full sync on schedule/manual, patch sync on events (default)
 */
export type SyncMode = 'full' | 'patch' | 'auto';

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
  /** Sync mode for the import workflow */
  sync_mode?: SyncMode;
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
  /** Sync mode for the export workflow */
  sync_mode?: SyncMode;
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
 * Patch direction enum
 */
type PatchDirection = 'to_repository' | 'to_connection';

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
  | PipelineStageTransform
  | PipelineStageEmbeddings
  | PipelineStagePatch
  | PipelineStageFieldMapping
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
 * Pipeline Stage that performs a repository action (commit, merge, revert, delete)
 */
interface PipelineStageRepositoryAction {
  type: 'repository_action';
  /** Type of repository action */
  repository_action_type: 'commit' | 'merge' | 'revert' | 'delete';
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
  /** Path to delete (for delete) */
  repository_action_delete_path?: string;
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

/**
 * Pipeline Stage that transforms data
 */
interface PipelineStageTransform {
  type: 'transform';
  /** Type of transformation to apply */
  transform_operation: TransformOperationType;
  /** Transform mode: single file or all files. Defaults to 'all' if not specified. */
  transform_mode?: 'single' | 'all';
  /** Optional: specific file name to transform (for single mode) */
  transform_target_name?: string;
  /** Field renames (for field_rename operation) */
  transform_field_renames?: FieldRename[];
  /** Fields to remove (for field_remove operation) */
  transform_fields_to_remove?: string[];
  /** Output file name (for file_rename operation) */
  transform_output_name?: string;
  /** Output format (for format_convert operation) */
  transform_output_format?: OutputFormat;
}

/**
 * Pipeline Stage that applies patches to a repository or connection
 */
interface PipelineStagePatch {
  type: 'patch';
  /** Direction of the patch operation */
  patch_direction: PatchDirection;
  /** Source file containing the patch data (default: trigger_event.json) */
  patch_source_file?: string;
  /** Target repository slug (when direction is to_repository) */
  patch_repository?: string;
  /** Target repository branch (when direction is to_repository) */
  patch_repository_branch?: string;
  /** Target path within the repository (when direction is to_repository) */
  patch_repository_path?: string;
  /** Target connection ID (when direction is to_connection) */
  patch_connection_id?: string;
  /** Target path within the connection (when direction is to_connection) */
  patch_connection_path?: string;
}

/**
 * Pipeline Stage that applies field mappings to transform data structure
 */
interface PipelineStageFieldMapping {
  type: 'field_mapping';
  /** Field mappings to apply */
  field_mapping_mappings: FieldMapping[];
  /** Mode: single file or all files. Defaults to 'all' if not specified. */
  field_mapping_mode?: 'single' | 'all';
  /** Optional: specific file name to target (for single mode) */
  field_mapping_target_name?: string;
  /** Optional: output file name (for file renaming) */
  field_mapping_output_name?: string;
}

/**
 * Embeddings operation types
 */
type EmbeddingsOperationType = 'vectorize' | 'search';

/**
 * Pipeline Stage that performs embeddings operations (vectorize or search)
 */
interface PipelineStageEmbeddings {
  type: 'embeddings';
  /** Type of embeddings operation to perform */
  embeddings_operation: EmbeddingsOperationType;
  /** Slug of the repository for embeddings */
  embeddings_repository: string;
  /** Branch in the repository */
  embeddings_branch?: string;
  /** OpenAI embedding model */
  embeddings_model?: string;
  /** Embedding dimensions */
  embeddings_dimensions?: number;
  /** Text chunk size for splitting documents */
  embeddings_chunk_size?: number;
  /** Overlap between consecutive chunks */
  embeddings_overlap?: number;
  /** Output path for the embedding file (for vectorize) */
  embeddings_output_path?: string;
  /** Path to the embedding file (for search) */
  embeddings_path?: string;
  /** Search query text (for search) */
  embeddings_query?: string;
  /** Number of results to return (for search) */
  embeddings_top_k?: number;
  /** Optional metadata filters (for search) */
  embeddings_filter?: Record<string, string>;
  /** Custom metadata key-value pairs applied to all embedding records (vectorize only) */
  embeddings_metadata?: Record<string, string>;
  /** Priority weight for RAG retrieval, 0.0-1.0 (vectorize only) */
  embeddings_priority?: number;
}
