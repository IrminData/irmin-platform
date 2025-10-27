'use client';

import { memo, useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';

import type { WorkflowWizardData } from '../types';

/**
 * Step component for configuring general workflow properties
 * and confirming the creation of the workflow
 */
function ConfigureWorkflowStep({
  wizardData,
  updateWizardData,
  goBack,
  closeModal,
}: {
  wizardData: WorkflowWizardData;
  updateWizardData: (updates: Partial<WorkflowWizardData>) => void;
  goBack: () => void;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { createWorkflowMutation } = useWorkflows();

  const [initialWorkflowSchedule] = useState(wizardData.schedule);

  const handleCreate = useCallback(async () => {
    try {
      if (!wizardData.type) return;
      await createWorkflowMutation.mutateAsync({
        type: wizardData.type,
        name: wizardData.name,
        description: wizardData.description,
        documentation: wizardData.documentation,
        workflowable: wizardData.workflowable,
        schedule: wizardData.schedule,
      });
      closeModal();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  }, [createWorkflowMutation, wizardData, closeModal]);

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        <div className='flex flex-col gap-2'>
          <Label>{dict.common.name}</Label>
          <Input
            required
            type='text'
            disabled={createWorkflowMutation.isPending}
            defaultValue={wizardData.name}
            onChange={(e) =>
              updateWizardData({
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
            disabled={createWorkflowMutation.isPending}
            defaultValue={wizardData.description}
            onChange={(e) =>
              updateWizardData({
                description: e.target.value,
              })
            }
          />
        </div>
        <div className='rounded-md border border-foreground/20 px-2 py-4'>
          <WorkflowScheduleForm
            initialData={initialWorkflowSchedule}
            disableSaveButton={true}
            updateSchedule={async (newSchedule) => {
              updateWizardData({
                schedule: newSchedule,
              });
            }}
          />
        </div>
      </div>
      <div className='grow' />
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
          loading={createWorkflowMutation.isPending}
          onClick={handleCreate}
        >
          {dict.workflow.create.confirmAndCreate}
        </Button>
        <Button
          className='mb-6 inline-block w-full'
          variant='link'
          size='sm'
          disabled={createWorkflowMutation.isPending}
          onClick={goBack}
        >
          {dict.workflow.create.goBack}
        </Button>
      </div>
    </div>
  );
}

export default memo(ConfigureWorkflowStep);
