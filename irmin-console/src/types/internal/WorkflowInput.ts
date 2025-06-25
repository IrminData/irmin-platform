import { WorkflowSchedule } from '@/types/core/Schedule';
import { Workflowable, WorkflowableType } from '@/types/core/Workflow';

/**
 * Interface for creating a workflow
 */
export interface WorkflowRequest {
  type: WorkflowableType;
  name: string;
  description?: string;
  documentation?: string;
  workflowable?: Workflowable;
  schedule?: WorkflowSchedule;
}
