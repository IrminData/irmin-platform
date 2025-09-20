'use client';

import { memo, useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

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

  const workflowable = useMemo(() => wizardData.workflowable, [wizardData]);

  const handleNextStep = useCallback(() => {
    goNext();
  }, [goNext]);

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
      const currentRequest = convertToWorkflowRequest(wizardData);
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
    [wizardData, updateWizardData, convertToWorkflowRequest]
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
