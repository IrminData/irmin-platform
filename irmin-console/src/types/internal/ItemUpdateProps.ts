import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

/**
 * Object containing the properties that can be updated for an item.
 * Could be used for connections, repositories, etc.
 */
export type ItemUpdateProps = {
  /** The name of the item */
  name?: string;
  /** The description of the item */
  description?: string;
  /** The documentation for the item */
  documentation?: string;
  /** The schedule for the workflow */
  schedule?: WorkflowSchedule;
};
