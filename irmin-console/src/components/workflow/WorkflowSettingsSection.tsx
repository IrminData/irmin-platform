'use client';

import { useCallback, useState } from 'react';

import ReactSelect from 'react-select';

import { FaPause, FaPlay } from 'react-icons/fa6';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workflow } from '@/types/api/Workflow';

/**
 * Workflow Settings section component
 *
 * @param props0 - The props
 * @param props0.workflow - The workflow to view and edit settings for
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

  const [nameField, setNameField] = useState(workflow?.name ?? '');
  const [descriptionField, setDescriptionField] = useState(
    workflow?.description ?? ''
  );
  const [cronField, setCronField] = useState(workflow?.cron_syntax ?? '');
  const [ownerField, setOwnerField] = useState(workflow?.owner ?? null);

  /**
   * Updates the workflow with the new details provided
   * Uses {@link updateWorkflow} to update the workflow details
   * Uses {@link reassignWorkflow} to change the owner of the workflow
   * Shows {@link irminAlert} on success or error
   */
  const handleUpdateWorkflow = useCallback(async () => {
    try {
      if (ownerField && ownerField?.id !== workflow.owner.id) {
        // Change the owner of the workflow if it's different
        await reassignWorkflow(workflow.id, ownerField);
        irminAlert('success', dict.workflow.settings.workflowOwnerChanged);
      }
      // Update other workflow details
      const name = nameField.trim();
      const description = descriptionField.trim();
      const cron_syntax = cronField.trim();
      await updateWorkflow(workflow.id, {
        ...workflow,
        name: name,
        description: description,
        cron_syntax: cron_syntax,
      });
      irminAlert('success', dict.workflow.settings.workflowUpdated);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorUpdatingWorkflow
      );
    }
  }, [
    workflow,
    updateWorkflow,
    reassignWorkflow,
    nameField,
    descriptionField,
    cronField,
    ownerField,
    irminAlert,
    dict,
  ]);

  /**
   * Deletes the workflow after confirming with the user
   * Uses {@link deleteWorkflow} to delete the workflow
   * Shows {@link irminAlert} on success or error
   */
  const handleDeleteWorkflow = useCallback(() => {
    try {
      irminConfirm(
        'warning',
        dict.workflow.settings.areYouSureYouWantToDelete,
        (confirmed) => {
          if (confirmed) {
            deleteWorkflow(workflow.id);
            irminAlert('success', dict.workflow.settings.workflowUpdated);
          }
        }
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorUpdatingWorkflow
      );
    }
  }, [workflow, irminConfirm, deleteWorkflow, irminAlert, dict]);

  /**
   * Pauses or resumes the workflow based on the current status
   * Uses {@link pauseWorkflow} to pause the workflow
   * Uses {@link resumeWorkflow} to resume the workflow
   * Shows {@link irminAlert} on success or error
   */
  const handlePauseOrResume = useCallback(async () => {
    try {
      if (workflow.status === 'paused') {
        await resumeWorkflow(workflow.id);
        irminAlert('success', dict.workflow.settings.workflowResumed);
      } else {
        await pauseWorkflow(workflow.id);
        irminAlert('success', dict.workflow.settings.workflowPaused);
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorUpdatingWorkflow
      );
    }
  }, [workflow, pauseWorkflow, resumeWorkflow, irminAlert, dict]);

  return (
    <div className='container relative mx-auto my-12 max-w-6xl px-4'>
      <div className='min-h-96 w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-3 py-8 shadow-md dark:bg-irmin_black-600 dark:shadow-black'>
        <div className='mb-8 flex flex-row items-center justify-between px-2'>
          <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
            {dict.workflow.tabs.settings}
          </h2>
          {workflow.status === 'paused' ? (
            <Button
              size='sm'
              colorScheme='gray'
              variant='solid'
              icon={<FaPlay size={14} />}
              onClick={handlePauseOrResume}
            >
              {dict.workflow.settings.resumeWorkflow}
            </Button>
          ) : (
            <Button
              size='sm'
              colorScheme='gray'
              variant='solid'
              icon={<FaPause size={14} />}
              onClick={handlePauseOrResume}
            >
              {dict.workflow.settings.pauseWorkflow}
            </Button>
          )}
        </div>
        <div className='flex flex-col gap-4'>
          <div>
            <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
              {dict.workflow.settings.name}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='h-11 w-full'
              type='text'
              name='name'
              defaultValue={nameField}
              onChange={(e) => setNameField(e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
              {dict.workflow.settings.description}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='w-full'
              type='text'
              name='name'
              defaultValue={descriptionField}
              onChange={(e) => setDescriptionField(e.target.value)}
              longtext={{
                rows: 3,
              }}
            />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
              {dict.workflow.settings.syncInterval}
            </label>
            <Input
              size='sm'
              variant='outline'
              colorScheme='gray'
              required
              className='h-11 w-full'
              type='text'
              name='cron'
              defaultValue={cronField}
              onChange={(e) => setCronField(e.target.value)}
              placeholder={dict.workflow.settings.syncIntervalPlaceholder}
            />
          </div>
          <div>
            <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
              {dict.workflow.settings.owner}
            </label>
            <ReactSelect
              value={ownerField}
              onChange={(newValue) => {
                if (!newValue) return;
                setOwnerField(newValue);
              }}
              options={currentWorkspace?.users ?? []}
              getOptionLabel={(option) => option.email}
              className='react-select-container'
              classNamePrefix='react-select'
            />
          </div>
          <Button
            className='h-11 w-full'
            type='submit'
            size='sm'
            colorScheme='primary'
            variant='solid'
            onClick={handleUpdateWorkflow}
          >
            {dict.workflow.settings.saveChanges}
          </Button>
          <div className='mt-8'>
            <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
              {dict.workflow.settings.dangerZone}
            </p>
            <p className='mt-2 text-xs text-gray-700 md:text-base dark:text-gray-200'>
              {dict.workflow.settings.deletionNote}
            </p>
            <Button
              className='mt-4 dark:bg-gray-800 dark:text-white'
              size='sm'
              colorScheme='secondary'
              variant='outline'
              onClick={handleDeleteWorkflow}
            >
              {dict.workflow.settings.delete}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowSettingsSection;
