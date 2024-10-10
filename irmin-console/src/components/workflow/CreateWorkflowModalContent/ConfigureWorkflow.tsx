'use client';

import { useCallback, useRef, useState } from 'react';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { WorkflowSetup } from '@/types/internal/WorkflowSetup';

/**
 * Configure general workflow properties,
 * like name, description and sync interval
 * and confirm the creation of the workflow
 *
 * @param props - Component properties
 * @param props.workflowData - Workflow setup data
 * @param props.setWorkflowData - Function to set the workflow setup data
 * @param props.setCurrentStep - Function to set the current step
 * @param props.closeModal - Function to close the modal
 */
export default function ConfigureWorkflow({
  workflowData,
  setWorkflowData,
  setCurrentStep,
  closeModal,
}: {
  workflowData: WorkflowSetup;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const {
    workflows: { createWorkflow },
  } = useWorkspace();
  const [processing, setProcessing] = useState(false);

  const initialWorkflowSchedule = useRef(workflowData.schedule);
  const creatingWorkflow = useRef(false);

  /**
   * Create the workflow with the provided data using the Irmin API
   */
  const handleCreate = useCallback(async () => {
    // Prevent multiple requests
    if (creatingWorkflow.current) return;
    try {
      creatingWorkflow.current = true;
      setProcessing(true);
      // Create the workflow
      const res = await createWorkflow(workflowData);
      // Show the result to the user
      irminAlert('success', res?.message ?? 'Workflow created successfully');
      closeModal();
    } catch (error) {
      console.error('Failed to create workflow', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to create the workflow'
      );
    } finally {
      setProcessing(false);
      creatingWorkflow.current = false;
    }
  }, [irminAlert, workflowData, createWorkflow, closeModal]);

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        <div className='flex flex-col gap-2'>
          <Label>{dict.workflow.name}</Label>
          <Input
            required
            type='text'
            defaultValue={workflowData.name}
            onChange={(e) =>
              setWorkflowData({
                ...workflowData,
                name: e.target.value,
              })
            }
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label>{dict.workflow.description}</Label>
          <Input
            required
            type='text'
            longtext={{
              rows: 3,
            }}
            defaultValue={workflowData.description}
            onChange={(e) =>
              setWorkflowData({
                ...workflowData,
                description: e.target.value,
              })
            }
          />
        </div>
        <div className='rounded-md border border-foreground/20 px-2 py-4'>
          <WorkflowScheduleForm
            initialData={initialWorkflowSchedule.current}
            disableSaveButton={true}
            updateSchedule={(newSchedule) => {
              setWorkflowData({
                ...workflowData,
                schedule: newSchedule,
              });
            }}
          />
        </div>
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='default'
          size={'lg'}
          disabled={processing}
          onClick={handleCreate}
        >
          {dict.workflow.create.confirmAndCreate}
        </Button>
        <Button
          className='mb-6 inline-block w-full'
          variant='link'
          size='sm'
          disabled={processing}
          onClick={() => setCurrentStep(1)}
        >
          {dict.workflow.create.goBack}
        </Button>
      </div>
    </div>
  );
}
