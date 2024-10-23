'use client';

import { useCallback } from 'react';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { useUsers } from '@/context/UsersContext';
import { useWorkflow } from '@/context/WorkflowContext';

interface WorkflowFormValues {
  name: string;
  description: string;
  cron_syntax: string;
  owner: string;
}

/**
 * Workflow Settings section component
 *
 * Handles workflow settings updates, reassignment, deletion, and pausing/resuming.
 * Uses {@link SettingsForm} to show and edit the workflow settings.
 */
const WorkflowSettingsSection = () => {
  const { dict } = useLocale();
  const { users } = useUsers();
  const { workflow, updateWorkflow, reassignWorkflow, deleteWorkflow } =
    useWorkflow();

  const handleUpdateWorkflow = useCallback(
    async (data: WorkflowFormValues) => {
      if (data.owner !== workflow.owner.id) {
        await reassignWorkflow(data.owner);
      }
      await updateWorkflow({
        name: data.name,
        description: data.description,
      });
    },
    [workflow, updateWorkflow, reassignWorkflow]
  );

  // Define field configurations
  const fieldConfiguration: FieldConfig<WorkflowFormValues>[] = [
    {
      name: 'name',
      label: dict.misc.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.misc.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.workflow.owner,
      type: 'select',
      options:
        users?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  return (
    <div id='workflow-settings-section'>
      <SettingsForm<WorkflowFormValues>
        initialValues={{
          name: workflow.name,
          description: workflow.description,
          owner: workflow.owner.id,
        }}
        onSubmit={handleUpdateWorkflow}
        fieldConfiguration={fieldConfiguration}
        deleteItem={deleteWorkflow}
        itemName='Workflow'
        submitButtonLabel={dict.workflow.settings.saveChanges}
        deleteButtonLabel={dict.workflow.settings.delete}
        dangerZoneMessage={dict.workflow.settings.deletionNote}
      />
    </div>
  );
};

export default WorkflowSettingsSection;
