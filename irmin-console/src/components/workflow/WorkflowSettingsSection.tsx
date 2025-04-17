'use client';

import { useCallback, useState } from 'react';

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
 * Handles workflow settings updates, transferment, deletion, and pausing/resuming.
 * Uses {@link SettingsForm} to show and edit the workflow settings.
 */
const WorkflowSettingsSection = () => {
  const { dict } = useLocale();
  const { users } = useUsers();
  const { workflow, updateWorkflow, transferWorkflow, deleteWorkflow } =
    useWorkflow();

  const [submitting, setSubmitting] = useState(false);
  const handleUpdateWorkflow = useCallback(
    async (data: WorkflowFormValues) => {
      try {
        setSubmitting(true);
        if (data.owner !== workflow.owner.id) {
          await transferWorkflow(data.owner);
        }
        await updateWorkflow({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        console.error('Error updating workflow:', error);
      } finally {
        setSubmitting(false);
      }
    },
    [workflow, updateWorkflow, transferWorkflow]
  );

  // Define field configurations
  const fieldConfiguration: FieldConfig<WorkflowFormValues>[] = [
    {
      name: 'name',
      label: dict.common.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.common.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.list.owner,
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
        submitting={submitting}
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
