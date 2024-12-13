import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { WorkflowableType } from '@/types/core/Workflow';
import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

/**
 * Pipeline stage input object.
 *
 * Seperate object to define the input of a pipeline stage used for creation or editing.
 */
export type PipelineStageInput = {
  description: string;
  write: boolean;
  read: boolean;
  type: 'action' | 'connection' | 'repository';
  executable?: string;
  /** ID of the connection */
  connection?: string;
  connection_write_path?: string;
  connection_read_path?: string;
  /** Slug of the repository */
  repository?: string;
  branch?: string;
  path?: string;
};

/**
 * Workflow setup object
 *
 * Please note, that different workflow will have different properties
 * required to be set.
 */
export interface WorkflowSetup {
  /** Workflow name */
  name: string;
  /** Workflow description */
  description: string;
  /** Workflow documentation */
  documentation: string;
  /** Workflow schedule configuration of when to run the workflow */
  schedule: WorkflowSchedule;
  /** Type of the workflow */
  type: WorkflowableType;
  /** Connection to use in the workflow */
  connection: Connection | null;
  /** Path to use in the workflow */
  path: string;
  /** Branch to use in the workflow */
  branch: string;
  /** Repository to use in the workflow */
  repository: Repository | null;
  /** If the workflow should be recursive */
  recursive: boolean;
  /** Path to the script file to be executed as an action workflow */
  executable: string;
  /** If the pipeline workflow should be live */
  live: boolean;
  /** Stages to run in the pipeline workflow */
  stages: PipelineStageInput[];
}
