'use client';

import { useCallback, useRef } from 'react';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workflow } from '@/types/core/Workflow';

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
 *
 * @param props - The props
 * @param props.workflow - The workflow to view and edit settings for
 */
const WorkflowSettingsSection = ({ workflow }: { workflow: Workflow }) => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    workflows: { updateWorkflow, reassignWorkflow, deleteWorkflow },
  } = useWorkspace();

  const processing = useRef(false);

  /**
   * Updates the workflow with the new details provided
   */
  const handleUpdateWorkflow = useCallback(
    async (data: WorkflowFormValues) => {
      if (processing.current) return;
      try {
        processing.current = true;
        if (!workflow) return;

        // Check if the owner has changed
        if (data.owner && data.owner !== workflow.owner.id) {
          // Find the new owner object
          const newOwner = currentWorkspace?.users?.find(
            (user) => user.id === data.owner
          );
          if (newOwner) {
            // Change the owner if it's different and found
            const res = await reassignWorkflow(workflow.id, newOwner);
            irminAlert(
              'success',
              res.message ?? 'Workflow reassigned successfully'
            );
          }
        }

        // Update other workflow details
        const res = await updateWorkflow(workflow.id, {
          ...workflow,
          name: data.name.trim(),
          description: data.description.trim(),
        });

        irminAlert('success', res.message ?? 'Workflow updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            'Error updating the workflow. Please try again.'
        );
      } finally {
        processing.current = false;
      }
    },
    [workflow, updateWorkflow, currentWorkspace, reassignWorkflow, irminAlert]
  );

  /**
   * Deletes the workflow after confirming with the user
   */
  const handleDeleteWorkflow = useCallback(async () => {
    if (processing.current) return;
    if (!workflow) return;
    try {
      processing.current = true;
      const confirmed = await irminConfirm(
        'warning',
        dict.workflow.settings.areYouSureYouWantToDelete
      );
      if (!confirmed) return;
      const res = await deleteWorkflow(workflow.id);
      irminAlert('success', res.message ?? 'Workflow deleted successfully');
    } catch (error) {
      console.error('Failed to delete the workflow:', error);
      irminAlert(
        'error',
        (error as Error)?.message ??
          'Error deleting the workflow. Please try again.'
      );
    } finally {
      processing.current = false;
    }
  }, [workflow, irminConfirm, deleteWorkflow, irminAlert, dict]);

  // Define field configurations
  const fieldConfiguration: FieldConfig<WorkflowFormValues>[] = [
    {
      name: 'name',
      label: dict.workflow.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.workflow.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.workflow.owner,
      type: 'select',
      options:
        currentWorkspace?.users?.map((user) => ({
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
        deleteItem={handleDeleteWorkflow}
        itemName='Workflow'
        submitButtonLabel={dict.workflow.settings.saveChanges}
        deleteButtonLabel={dict.workflow.settings.delete}
        dangerZoneMessage={dict.workflow.settings.deletionNote}
      />
    </div>
  );
};

export default WorkflowSettingsSection;
