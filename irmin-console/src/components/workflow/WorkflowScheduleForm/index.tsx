import { getRepositories } from '@/lib/actions/repositories';
import { getWorkflows } from '@/lib/actions/workflows';

import { WorkflowSchedule } from '@/types/core/WorkflowSchedule';

import WorkflowScheduleFormContent from './WorkflowScheduleFormContent';

/**
 * Form to configure a workflow schedule using react-hook-form
 *
 * @param props - Component properties
 * @param props.initialData - Initial schedule data
 * @param props.updateSchedule - Callback to call in order to update the schedule
 * @param props.disableSaveButton - Disable the save button and auto-update schedule on change
 */
export default async function WorkflowScheduleForm({
  initialData,
  updateSchedule,
  disableSaveButton,
}: {
  initialData?: WorkflowSchedule;
  updateSchedule: (schedule: WorkflowSchedule) => void;
  disableSaveButton?: boolean;
}) {
  const [repositories, workflows] = await Promise.all([
    getRepositories(),
    getWorkflows(),
  ]);
  return (
    <WorkflowScheduleFormContent
      repositories={repositories}
      workflows={workflows}
      initialData={initialData}
      updateSchedule={updateSchedule}
      disableSaveButton={disableSaveButton}
    />
  );
}
