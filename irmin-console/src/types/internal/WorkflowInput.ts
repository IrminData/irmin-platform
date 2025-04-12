import { WorkflowSchedule } from '@/types/core/Schedule';

export interface ImportWorkflowableInput {
  type: 'import';
  /** ID of the connection */
  connection: string;
  connection_path: string;
  /** Slug of the repository */
  repository: string;
  branch: string;
  path: string;
}

export interface ExportWorkflowableInput {
  type: 'export';
  /** ID of the connection */
  connection: string;
  connection_path: string;
  /** Slug of the repository */
  repository: string;
  branch: string;
  path: string;
}

export interface ActionWorkflowableInput {
  type: 'action';
  /** Path to the executable file */
  executable: string;
  /** Slug of the repository */
  repository?: string;
  branch?: string;
  path?: string;
}

export interface PipelineWorkflowableInput {
  type: 'pipeline';
  live: boolean;
  stages: PipelineStageInput[];
}

export type PipelineStageInput = {
  description: string;
  write: boolean;
  read: boolean;
} & (
  | PipelineStageActionInput
  | PipelineStageConnectionInput
  | PipelineStageRepositoryInput
);

export interface PipelineStageActionInput {
  type: 'action';
  executable: string;
}

export interface PipelineStageConnectionInput {
  type: 'connection';
  /** ID of the connection */
  connection: string;
  connection_write_path: string;
  connection_read_path: string;
}

export interface PipelineStageRepositoryInput {
  type: 'repository';
  /** Slug of the repository */
  repository: string;
  branch: string;
  path: string;
}

export type WorkflowableInput =
  | ImportWorkflowableInput
  | ExportWorkflowableInput
  | ActionWorkflowableInput
  | PipelineWorkflowableInput;

export interface WorkflowInput {
  name: string;
  description: string;
  documentation: string;
  schedule: WorkflowSchedule;
  workflowable: WorkflowableInput;
}
