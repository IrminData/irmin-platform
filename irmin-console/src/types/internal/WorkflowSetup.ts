import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { WorkflowSchedule } from '@/types/core/Schedule';
import { WorkflowableType } from '@/types/core/Workflow';

/**
 * Pipeline stage input object.
 *
 * Separate object to define the input of a pipeline stage used for creation or editing.
 */
export type PipelineStageInput = {
  /** Description of the pipeline stage */
  description: string;
  /** Write permission for the pipeline stage */
  write: boolean;
  /** Read permission for the pipeline stage */
  read: boolean;
  /** Type of the pipeline stage */
  type: 'action' | 'connection' | 'repository';
  /** Executable script for the pipeline stage */
  executable?: string;
  /** ID of the connection */
  connection?: string;
  /** Write path for the connection */
  connection_write_path?: string;
  /** Read path for the connection */
  connection_read_path?: string;
  /** Slug of the repository */
  repository?: string;
  /** Branch of the repository */
  branch?: string;
  /** Path in the repository */
  path?: string;
};

/**
 * Workflow setup object
 *
 * Please note, that different workflows will have different properties
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
