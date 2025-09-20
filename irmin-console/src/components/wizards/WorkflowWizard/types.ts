import type { WorkflowSchedule } from '@/types/core/Schedule';
import type { Workflowable, WorkflowableType } from '@/types/core/Workflow';

/**
 * Workflow wizard data state
 */
export interface WorkflowWizardData {
  type?: WorkflowableType;
  name: string;
  description?: string;
  documentation?: string;
  workflowable?: Workflowable;
  schedule?: WorkflowSchedule;
}
