'use client';

import { memo, useCallback, useRef } from 'react';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useCreateWorkflow } from '@/context/CreateWorkflowContext';
import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/useWorkflows';

import { Repository } from '@/types/core/Repository';

/**
 * Configure general workflow properties,
 * like name, description and sync interval
 * and confirm the creation of the workflow
 *
 * @param props - Component properties
 * @param props.repositories - List of repositories
 * @param props.setCurrentStep - Function to set the current step
 * @param props.closeModal - Function to close the modal
 */
function ConfigureWorkflow({
  repositories,
  setCurrentStep,
  closeModal,
}: {
  repositories: Repository[];
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { workflowsQuery } = useWorkflows();
  const { workflowData, setWorkflowData, createWorkflow, processingCreation } =
    useCreateWorkflow();

  const initialWorkflowSchedule = useRef(workflowData.schedule);

  const handleCreate = useCallback(async () => {
    const success = await createWorkflow();
    if (success) {
      closeModal();
    }
  }, [createWorkflow, closeModal]);

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        <div className='flex flex-col gap-2'>
          <Label>{dict.common.name}</Label>
          <Input
            required
            type='text'
            disabled={processingCreation}
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
          <Label>{dict.common.description}</Label>
          <Input
            required
            type='text'
            longtext={{
              rows: 3,
            }}
            disabled={processingCreation}
            defaultValue={workflowData.description}
            onChange={(e) =>
              setWorkflowData({
                ...workflowData,
                description: e.target.value,
              })
            }
          />
        </div>
        <div className='border-foreground/20 rounded-md border px-2 py-4'>
          <WorkflowScheduleForm
            workflows={workflowsQuery.data?.data ?? []}
            repositories={repositories}
            initialData={initialWorkflowSchedule.current}
            disableSaveButton={true}
            updateSchedule={async (newSchedule) => {
              setWorkflowData({
                ...workflowData,
                schedule: newSchedule,
              });
            }}
          />
        </div>
      </div>
      <div className='grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='gradient'
          size={'lg'}
          loading={processingCreation}
          onClick={handleCreate}
        >
          {dict.workflow.create.confirmAndCreate}
        </Button>
        <Button
          className='mb-6 inline-block w-full'
          variant='link'
          size='sm'
          disabled={processingCreation}
          onClick={() => setCurrentStep(1)}
        >
          {dict.workflow.create.goBack}
        </Button>
      </div>
    </div>
  );
}

export default memo(ConfigureWorkflow);
