'use client';

import { memo, useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Action, Export, Import, Pipeline } from '@/types/core/Workflow';
import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

import type { WorkflowWizardData } from '../types';
import ActionWorkflow from '../workflowable/ActionWorkflow';
import ExportWorkflow from '../workflowable/ExportWorkflow';
import ImportWorkflow from '../workflowable/ImportWorkflow';
import PipelineWorkflow from '../workflowable/PipelineWorkflow';

/**
 * Step component for configuring workflow type specific properties
 */
function ConfigureWorkflowableStep({
  wizardData,
  updateWizardData,
  goNext,
  goBack,
}: {
  wizardData: WorkflowWizardData;
  updateWizardData: (updates: Partial<WorkflowWizardData>) => void;
  goNext: () => void;
  goBack?: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const workflowable = useMemo(() => wizardData.workflowable, [wizardData]);

  const validateWorkflowable = useCallback((): boolean => {
    const currentWorkflowable = wizardData.workflowable;
    if (!currentWorkflowable) {
      irminAlert('error', 'Workflowable configuration is missing');
      return false;
    }

    switch (currentWorkflowable.type) {
      case 'import': {
        const importWorkflowable = currentWorkflowable as Import;
        if (!importWorkflowable.connection_id) {
          irminAlert('error', 'Please select a connection');
          return false;
        }
        if (!importWorkflowable.repository) {
          irminAlert('error', 'Please select a destination repository');
          return false;
        }
        if (!importWorkflowable.repository_branch) {
          irminAlert('error', 'Please specify a destination branch');
          return false;
        }
        if (!importWorkflowable.import_to_repository_path) {
          irminAlert(
            'error',
            'Please specify a destination path in repository'
          );
          return false;
        }
        if (
          !importWorkflowable.import_from_connection_paths ||
          importWorkflowable.import_from_connection_paths.length === 0
        ) {
          irminAlert(
            'error',
            'Please add at least one source path from connection'
          );
          return false;
        }
        break;
      }
      case 'export': {
        const exportWorkflowable = currentWorkflowable as Export;
        if (!exportWorkflowable.connection_id) {
          irminAlert('error', 'Please select a connection');
          return false;
        }
        if (!exportWorkflowable.repository) {
          irminAlert('error', 'Please select a source repository');
          return false;
        }
        if (!exportWorkflowable.repository_branch) {
          irminAlert('error', 'Please specify a source branch');
          return false;
        }
        if (!exportWorkflowable.export_to_connection_path) {
          irminAlert(
            'error',
            'Please specify a destination path in connection'
          );
          return false;
        }
        if (
          !exportWorkflowable.export_from_repository_paths ||
          exportWorkflowable.export_from_repository_paths.length === 0
        ) {
          irminAlert(
            'error',
            'Please add at least one source path from repository'
          );
          return false;
        }
        break;
      }
      case 'action': {
        const actionWorkflowable = currentWorkflowable as Action;
        if (!actionWorkflowable.script_id) {
          irminAlert('error', 'Please select an executable script');
          return false;
        }
        break;
      }
      case 'pipeline': {
        // Pipeline validation can be added here if needed
        break;
      }
      default:
        break;
    }

    return true;
  }, [wizardData.workflowable, irminAlert]);

  const handleNextStep = useCallback(() => {
    if (validateWorkflowable()) {
      goNext();
    }
  }, [goNext, validateWorkflowable]);

  // Convert WorkflowWizardData to WorkflowRequest format
  const convertToWorkflowRequest = useCallback(
    (wizardData: WorkflowWizardData): WorkflowRequest => ({
      type: wizardData.type || 'action',
      name: wizardData.name,
      description: wizardData.description,
      documentation: wizardData.documentation,
      workflowable: wizardData.workflowable,
      schedule: wizardData.schedule,
    }),
    []
  );

  // Create a setWorkflowData function that updates the wizard data
  const setWorkflowData = useCallback(
    (updater: React.SetStateAction<WorkflowRequest>) => {
      const currentRequest: WorkflowRequest = {
        type: wizardData.type || 'action',
        name: wizardData.name || '',
        description: wizardData.description || '',
        documentation: wizardData.documentation || '',
        workflowable: wizardData.workflowable,
        schedule: wizardData.schedule,
      };

      const newRequest =
        typeof updater === 'function' ? updater(currentRequest) : updater;

      updateWizardData({
        type: newRequest.type,
        name: newRequest.name,
        description: newRequest.description,
        documentation: newRequest.documentation,
        workflowable: newRequest.workflowable,
        schedule: newRequest.schedule,
      });
    },
    [updateWizardData, wizardData]
  );

  // Early return if workflowable is not defined
  if (!workflowable) {
    return <></>;
  }

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowable.type === 'action' && (
          <ActionWorkflow
            workflowable={workflowable as Action}
            setWorkflowData={setWorkflowData}
          />
        )}
        {workflowable.type === 'import' && (
          <ImportWorkflow
            workflowable={workflowable as Import}
            setWorkflowData={setWorkflowData}
          />
        )}
        {workflowable.type === 'export' && (
          <ExportWorkflow
            workflowable={workflowable as Export}
            setWorkflowData={setWorkflowData}
          />
        )}
        {workflowable.type === 'pipeline' && (
          <PipelineWorkflow
            workflowable={workflowable as Pipeline}
            workflowData={convertToWorkflowRequest(wizardData)}
            setWorkflowData={setWorkflowData}
          />
        )}
      </div>
      <div
        className={`
          mt-auto border-t pt-4
          dark:border-gray-800
        `}
      >
        <Button
          className='mb-6 inline-block w-full'
          variant='gradient'
          size={'lg'}
          onClick={handleNextStep}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
        <Button
          className='mb-6 inline-block w-full'
          variant='link'
          size='sm'
          onClick={goBack}
        >
          {dict.workflow.create.goBack}
        </Button>
      </div>
    </div>
  );
}

export default memo(ConfigureWorkflowableStep);
