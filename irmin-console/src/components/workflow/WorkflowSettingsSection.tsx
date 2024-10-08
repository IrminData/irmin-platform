'use client';

import React, { useCallback } from 'react';

import { FaPause, FaPlay } from 'react-icons/fa6';

import Button from '@/components/ui/Button';
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
    workflows: {
      updateWorkflow,
      reassignWorkflow,
      deleteWorkflow,
      resumeWorkflow,
      pauseWorkflow,
    },
  } = useWorkspace();

  /**
   * Updates the workflow with the new details provided
   */
  const handleUpdateWorkflow = useCallback(
    async (data: WorkflowFormValues) => {
      try {
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
              res.message ?? dict.workflow.settings.workflowOwnerChanged
            );
          }
        }

        // Update other workflow details
        const res = await updateWorkflow(workflow.id, {
          ...workflow,
          name: data.name.trim(),
          description: data.description.trim(),
          cron_syntax: data.cron_syntax.trim(),
        });

        irminAlert(
          'success',
          res.message ?? dict.workflow.settings.workflowUpdated
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            dict.workflow.settings.errorUpdatingWorkflow
        );
      }
    },
    [
      workflow,
      updateWorkflow,
      currentWorkspace,
      reassignWorkflow,
      irminAlert,
      dict,
    ]
  );

  /**
   * Deletes the workflow after confirming with the user
   */
  const handleDeleteWorkflow = useCallback(() => {
    try {
      irminConfirm(
        'warning',
        dict.workflow.settings.areYouSureYouWantToDelete,
        async (confirmed) => {
          if (!confirmed) return;
          const res = await deleteWorkflow(workflow.id);
          irminAlert(
            'success',
            res.message ?? dict.workflow.settings.workflowDeleted
          );
        }
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorDeletingWorkflow
      );
    }
  }, [workflow, irminConfirm, deleteWorkflow, irminAlert, dict]);

  /**
   * Pauses or resumes the workflow based on the current status
   */
  const handlePauseOrResume = useCallback(async () => {
    try {
      if (workflow.status === 'paused') {
        const res = await resumeWorkflow(workflow.id);
        irminAlert(
          'success',
          res.message ?? dict.workflow.settings.workflowResumed
        );
      } else {
        const res = await pauseWorkflow(workflow.id);
        irminAlert(
          'success',
          res.message ?? dict.workflow.settings.workflowPaused
        );
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorUpdatingWorkflow
      );
    }
  }, [workflow, pauseWorkflow, resumeWorkflow, irminAlert, dict]);

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
      name: 'cron_syntax',
      label: dict.workflow.runInterval,
      type: 'text',
      placeholder: dict.workflow.runIntervalDescription,
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
    <div
      className='container relative mx-auto my-8 max-w-6xl'
      id='workflow-settings-section'
    >
      <div className='mb-8 px-4'>
        {workflow.status === 'paused' ? (
          <Button
            size='sm'
            variant='secondary'
            icon={<FaPlay size={14} />}
            onClick={handlePauseOrResume}
          >
            {dict.workflow.settings.resumeWorkflow}
          </Button>
        ) : (
          <Button
            size='sm'
            variant='secondary'
            icon={<FaPause size={14} />}
            onClick={handlePauseOrResume}
          >
            {dict.workflow.settings.pauseWorkflow}
          </Button>
        )}
      </div>
      <SettingsForm<WorkflowFormValues>
        initialValues={{
          name: workflow.name,
          description: workflow.description,
          cron_syntax: workflow.cron_syntax ?? undefined,
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
