'use client';

import { memo, useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WorkflowScheduleForm from '@/components/workflow/WorkflowScheduleForm';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useWorkflows } from '@/hooks/api';

import type { Tag } from '@/types/core/Tag';
import type { Workflow } from '@/types/core/Workflow';

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
  embedded = false,
  onComplete,
}: {
  wizardData: WorkflowWizardData;
  updateWizardData: (updates: Partial<WorkflowWizardData>) => void;
  goBack: () => void;
  closeModal: () => void;
  embedded?: boolean;
  onComplete?: (workflow: Workflow) => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
  const { createWorkflowMutation } = useWorkflows();

  const [initialWorkflowSchedule] = useState(wizardData.schedule);

  const handleTagsChange = useCallback(
    async (tags: Tag[]) => {
      updateWizardData({ tags });
      return tags;
    },
    [updateWizardData]
  );

  const handleCreate = useCallback(async () => {
    try {
      if (!wizardData.type) return;

      // Validate required fields
      if (!wizardData.name || wizardData.name.trim() === '') {
        irminAlert('error', 'Please enter a workflow name');
        return;
      }


      const res = await createWorkflowMutation.mutateAsync({
        type: wizardData.type,
        name: wizardData.name,
        description: wizardData.description,
        documentation: wizardData.documentation,
        workflowable: wizardData.workflowable,
        schedule: wizardData.schedule,
        tags: wizardData.tags?.map((t) => t.id),
      });

      if (!res.data) {
        throw new Error(res.message ?? 'Failed to create workflow');
      }

      irminAlert('success', res.message ?? 'Workflow created successfully');

      // Handle completion based on mode
      if (embedded && onComplete) {
        onComplete(res.data);
      } else {
        closeModal();
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to create workflow'
      );
    }
  }, [
    createWorkflowMutation,
    wizardData,
    closeModal,
    embedded,
    onComplete,
    irminAlert,
  ]);

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
          <Label>
            {dict.common.description} ({dict.common.optional.toLowerCase()})
          </Label>
          <Input
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
        <div className='flex flex-col gap-2'>
          <WorkspaceTagSelector
            selectedTags={wizardData.tags ?? []}
            onTagsChange={handleTagsChange}
            loading={false}
            disabled={createWorkflowMutation.isPending}
            workspaceSlug={workspaceSlug}
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
