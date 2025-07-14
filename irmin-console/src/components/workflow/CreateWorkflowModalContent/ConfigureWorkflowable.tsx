'use client';

import { memo, useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import ActionWorkflow from '@/components/workflow/Workflowable/ActionWorkflow';
import ExportWorkflow from '@/components/workflow/Workflowable/ExportWorkflow';
import ImportWorkflow from '@/components/workflow/Workflowable/ImportWorkflow';
import PipelineWorkflow from '@/components/workflow/Workflowable/PipelineWorkflow';

import { useCreateWorkflow } from '@/context/CreateWorkflowContext';
import { useLocale } from '@/context/LocaleContext';

import type { Action, Export, Import, Pipeline } from '@/types/core/Workflow';

/**
 * Configure workflow type specific properties
 *
 * @param props - Component properties
 * @param props.setCurrentStep - Function to set the current step
 */
function ConfigureWorkflowable({
  setCurrentStep,
}: {
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { workflowData, setWorkflowData } = useCreateWorkflow();
  const { dict } = useLocale();

  const workflowable = useMemo(() => workflowData.workflowable, [workflowData]);

  const handleNextStep = useCallback(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

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
            workflowData={workflowData}
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
      </div>
    </div>
  );
}

export default memo(ConfigureWorkflowable);
