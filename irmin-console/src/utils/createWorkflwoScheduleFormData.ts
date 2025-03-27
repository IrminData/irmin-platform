import {
  RepositoryTrigger,
  TimeTrigger,
  WorkflowRunTrigger,
  WorkflowSchedule,
} from '@/types/core/Schedule';

/**
 * Creates a FormData object from the provided `WorkflowSchedule` object.
 *
 * This function serializes the `WorkflowSchedule` into a FormData object by iterating through each of its properties
 * and appending them as individual fields. The `triggers` field, which is an array of different trigger types, is
 * processed and appended separately, depending on the type of each trigger.
 *
 * @param schedule - The `WorkflowSchedule` object that contains the schedule configuration for the workflow.
 *
 * @returns A FormData object containing the `WorkflowSchedule` fields, ready to be used in an HTTP request.
 *
 * @example
 * ```typescript
 * const schedule: WorkflowSchedule = {
 *   triggers: [
 *     { type: 'time', rrule: 'RRULE:FREQ=DAILY;INTERVAL=1;' },
 *     { type: 'repository-event', event: RepositoryEvent.PreCommit, repository: 'my-repo' }
 *   ],
 *   max_retries: 3,
 *   max_runtime: 3600,
 *   min_interval: 60,
 * };
 * const formData = createWorkflowFormData(schedule);
 * ```
 */
export default function createWorkflowScheduleFormData(
  schedule: WorkflowSchedule
): FormData {
  const formData = new FormData();

  // Append each trigger from the schedule's `triggers` array as individual fields
  schedule.triggers.forEach((trigger, index) => {
    formData.append(`trigger[${index}].type`, trigger.type);
    if (trigger.type === 'time') {
      // Append properties specific to TimeTrigger
      formData.append(
        `trigger[${index}].rrule`,
        (trigger as TimeTrigger).rrule
      );
    } else if (trigger.type === 'repository-event') {
      // Append properties specific to RepositoryTrigger
      const repositoryTrigger = trigger as RepositoryTrigger;
      formData.append(`trigger[${index}].event`, repositoryTrigger.event);
      if (repositoryTrigger.repository) {
        formData.append(
          `trigger[${index}].repository`,
          repositoryTrigger.repository
        );
      }
      if (repositoryTrigger.ref) {
        formData.append(`trigger[${index}].ref`, repositoryTrigger.ref);
      }
    } else if (trigger.type === 'workflow-run-event') {
      // Append properties specific to WorkflowRunTrigger
      const workflowRunTrigger = trigger as WorkflowRunTrigger;
      formData.append(`trigger[${index}].event`, workflowRunTrigger.event);
      if (workflowRunTrigger.workflow) {
        formData.append(
          `trigger[${index}].workflow`,
          workflowRunTrigger.workflow
        );
      }
    }
  });

  // Append additional optional properties if available
  if (schedule.max_retries !== undefined) {
    formData.append('max_retries', schedule.max_retries.toString());
  }
  if (schedule.max_runtime !== undefined) {
    formData.append('max_runtime', schedule.max_runtime.toString());
  }
  if (schedule.min_interval !== undefined) {
    formData.append('min_interval', schedule.min_interval.toString());
  }

  return formData;
}
