'use client';

import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useWorkflows } from '@/hooks/api';

import type { DataExportWizardData } from '../types';

/**
 * Step 4: Review and Create
 *
 * Users review their configuration and create the export workflow
 */
export default function ReviewAndCreateStep({
  wizardData,
  goBack,
  closeModal,
}: {
  wizardData: DataExportWizardData;
  goBack: () => void;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const { createWorkflowMutation } = useWorkflows('export');

  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState({
    workflow: false,
  });

  const handleCreate = useCallback(async () => {
    setIsCreating(true);

    try {
      // Create the export workflow
      setCreationProgress((prev) => ({ ...prev, workflow: true }));

      const workflowRes = await createWorkflowMutation.mutateAsync({
        name: wizardData.workflowData.name,
        description: wizardData.workflowData.description,
        documentation: wizardData.workflowData.documentation,
        schedule: wizardData.workflowData.schedule,
        type: 'export',
        workflowable: {
          type: 'export',
          connection_id: wizardData.connection?.id ?? '',
          export_from_repository_paths:
            wizardData.workflowData.export_from_repository_paths,
          repository: wizardData.repository?.slug ?? '',
          repository_branch: wizardData.workflowData.repository_branch,
          export_to_connection_path:
            wizardData.workflowData.export_to_connection_path,
          field_mappings: wizardData.workflowData.field_mappings,
          sync_mode: wizardData.workflowData.sync_mode,
        },
      });

      if (!workflowRes.data) {
        throw new Error(
          workflowRes.message ??
            dict.common.errors.mutations.createWorkflowFailed
        );
      }

      setCreationProgress((prev) => ({ ...prev, workflow: false }));

      irminAlert('success', dict.wizard.exportWorkflowCreatedSuccessfully);
      closeModal();
    } catch (error) {
      console.error('Error creating export workflow:', error);
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.common.errors.mutations.createWorkflowFailed
      );
    } finally {
      setIsCreating(false);
      setCreationProgress({
        workflow: false,
      });
    }
  }, [wizardData, createWorkflowMutation, irminAlert, dict, closeModal]);

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.wizard.reviewAndCreateExportWorkflow}
          </h3>
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.reviewAndCreateExportWorkflowDescription}
          </p>
        </div>
      </div>

      {/* Review Configuration */}
      <div className='space-y-6'>
        {/* Connection Information */}
        <div
          className={`
            rounded-lg border p-4
            dark:border-gray-800
          `}
        >
          <h4 className='mb-3 font-medium'>{dict.wizard.exportDestination}</h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.wizard.connection}:
              </span>
              <Badge variant='secondary'>{wizardData.connection?.name}</Badge>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.wizard.connector}:
              </span>
              <Badge variant='outline'>
                {wizardData.connection?.connector.name}
              </Badge>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.wizard.exportPath}:
              </span>
              <span
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.workflowData.export_to_connection_path}
              </span>
            </div>
          </div>
        </div>

        {/* Repository Information */}
        <div
          className={`
            rounded-lg border p-4
            dark:border-gray-800
          `}
        >
          <h4 className='mb-3 font-medium'>{dict.wizard.sourceRepository}</h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.wizard.repository}:
              </span>
              <Badge variant='secondary'>{wizardData.repository?.name}</Badge>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>{dict.wizard.branch}:</span>
              <Badge variant='outline'>
                {wizardData.workflowData.repository_branch}
              </Badge>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.wizard.exportPaths}:
              </span>
              <div className='flex flex-wrap gap-1'>
                {wizardData.workflowData.export_from_repository_paths.map(
                  (path) => (
                    <Badge key={path} variant='outline' className='text-xs'>
                      {path}
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Information */}
        <div
          className={`
            rounded-lg border p-4
            dark:border-gray-800
          `}
        >
          <h4 className='mb-3 font-medium'>{dict.wizard.workflowDetails}</h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.wizard.workflowName}:
              </span>
              <span
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.workflowData.name}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {dict.common.description}:
              </span>
              <span
                className={`
                  text-sm text-gray-600
                  dark:text-gray-400
                `}
              >
                {wizardData.workflowData.description}
              </span>
            </div>
            {wizardData.workflowData.documentation && (
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>
                  {dict.wizard.documentation}:
                </span>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {wizardData.workflowData.documentation}
                </span>
              </div>
            )}
            {wizardData.workflowData.schedule && (
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>
                  {dict.workflow.schedule.workflowSchedule}:
                </span>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {wizardData.workflowData.schedule.triggers?.length ?? 0}{' '}
                  {dict.workflow.schedule.trigger}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creation Progress */}
      {isCreating && (
        <div
          className={`
            rounded-lg border p-4
            dark:border-gray-800
          `}
        >
          <h4 className='mb-3 font-medium'>
            {dict.wizard.creatingExportWorkflow}
          </h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-2 rounded-full
                  ${creationProgress.workflow ? 'bg-green-500' : 'bg-gray-300'}
                `}
              />
              <span className='text-sm'>{dict.wizard.creatingWorkflow}</span>
            </div>
          </div>
        </div>
      )}

      <div
        className={`
          border-t pt-4
          dark:border-gray-800
        `}
      >
        <div className='flex gap-3'>
          <Button
            type='button'
            className='flex-1'
            size='lg'
            variant='secondary'
            onClick={goBack}
            disabled={isCreating}
          >
            {dict.common.back}
          </Button>
          <Button
            type='button'
            className='flex-1'
            size='lg'
            variant='default'
            onClick={handleCreate}
            disabled={isCreating}
            loading={isCreating}
          >
            {isCreating
              ? dict.wizard.creatingExportWorkflow
              : dict.wizard.createExportWorkflow}
          </Button>
        </div>
      </div>
    </div>
  );
}
