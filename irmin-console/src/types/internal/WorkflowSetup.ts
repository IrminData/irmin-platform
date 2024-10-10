import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { WorkflowableType } from '@/types/core/Workflow';
import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

/**
 * Workflow setup object
 *
 * Please note, that different workflow will have different properties
 * required to be set.
 *
 * @typeParam name - Workflow name
 * @typeParam description - Workflow description
 * @typeParam documentation - Workflow documentation
 * @typeParam schedule - Workflow schedule configuration of when to run the workflow
 * @typeParam type - Workflow type, eg. import, action, export
 * @typeParam connection - Connection to use in the workflow
 * @typeParam path - Path to use in the workflow
 * @typeParam branch - Branch to use in the workflow
 * @typeParam repository - Repository to use in the workflow
 * @typeParam recursive - If the workflow should be recursive
 * @typeParam executable - Path to the script file to be executed as an action workflow
 */
export interface WorkflowSetup {
  // Workflow properties
  name: string;
  description: string;
  documentation: string;
  schedule: WorkflowSchedule;
  // Workflowable properties
  type: WorkflowableType;
  connection: Connection | null;
  path: string;
  branch: string;
  repository: Repository | null;
  recursive: boolean;
  executable: string;
}
