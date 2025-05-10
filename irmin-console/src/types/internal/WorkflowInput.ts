import { WorkflowSchedule } from '@/types/core/Schedule';
import { ActionInputData } from '@/types/core/Workflow';

export interface ImportWorkflowableInput {
  type: 'import';
  /** ID of the connection to import data from */
  connection: string;
  /** Connection path to import data from */
  connection_path: string;
  /** Slug of the repository to import data to */
  repository: string;
  /** Branch of the repository to import data to */
  branch: string;
  /** Path to the directory to import data to */
  path: string;
}

export interface ExportWorkflowableInput {
  type: 'export';
  /** ID of the connection to export data to */
  connection: string;
  /** Connection path to export data to */
  connection_path: string;
  /** Slug of the repository to export data from */
  repository: string;
  /** Branch of the repository to export data from */
  branch: string;
  /** Path to the directory to export data from */
  path: string;
}

export interface ActionWorkflowableInput {
  type: 'action';
  /** Path to the executable file */
  executable: string;
  /** Slug of the repository to store results */
  repository?: string;
  /** Branch of the repository to store results */
  branch?: string;
  /** Path to the directory to store results */
  path?: string;
  /** Input data to provide to the action when it is executed */
  input?: ActionInputData[];
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
