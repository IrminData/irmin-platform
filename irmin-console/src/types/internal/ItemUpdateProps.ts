import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

/**
 * Object containing the properties that can be updated for an item.
 * Could be used for connections, repositories, etc.
 */
export type ItemUpdateProps = {
  name?: string;
  description?: string;
  documentation?: string;
  schedule?: WorkflowSchedule;
};
