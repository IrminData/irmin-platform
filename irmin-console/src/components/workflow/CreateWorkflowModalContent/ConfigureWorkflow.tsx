'use client';

import { useMemo, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { WorkflowSetup } from '.';

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
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();
  const [processing, setProcessing] = useState(false);

  const { workflowService } = useMemo(() => new IrminCore(locale), [locale]);

  const handleCreate = async () => {
    try {
      // Prevent if already processing
      if (processing) return;
      setProcessing(true);
      // Create the workflow
      let res: IrminAPIResponse | undefined;
      if (workflowData.type === 'action') {
        res = await workflowService.createActionWorkflow({
          name: workflowData.name,
          description: workflowData.description,
          cron_syntax: workflowData.cron,
          executable: workflowData.executable,
          repository: workflowData.repository?.slug ?? '',
          branch: workflowData.branch,
          path: workflowData.path,
        });
      }
      if (workflowData.type === 'import') {
        res = await workflowService.createImportWorkflow({
          name: workflowData.name,
          description: workflowData.description,
          cron_syntax: workflowData.cron,
          repository: workflowData.repository?.slug ?? '',
          branch: workflowData.branch,
          path: workflowData.path,
          connection: workflowData.connection?.id ?? '',
        });
      }
      if (workflowData.type === 'export') {
        res = await workflowService.createExportWorkflow({
          name: workflowData.name,
          description: workflowData.description,
          cron_syntax: workflowData.cron,
          repository: workflowData.repository?.slug ?? '',
          branch: workflowData.branch,
          path: workflowData.path,
          connection: workflowData.connection?.id ?? '',
          recursive: workflowData.recursive,
        });
      }
      // Show the result to the user
      irminAlert('success', res?.message ?? dict.workflow.create.success);
      closeModal();
    } catch (error) {
      console.error('Failed to create workflow', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? dict.workflow.create.failed
      );
    } finally {
      setProcessing(false);
    }
  };

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
        <div className='flex flex-col gap-2'>
          <Label>{dict.workflow.runInterval}</Label>
          <Input
            required
            type='text'
            defaultValue={workflowData.cron}
            onChange={(e) =>
              setWorkflowData({
                ...workflowData,
                cron: e.target.value,
              })
            }
          />
          <span className='text-xs opacity-60'>
            {dict.workflow.runIntervalDescription}
          </span>
        </div>
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='default'
          onClick={handleCreate}
        >
          {dict.workflow.create.confirmAndCreate}
        </Button>
        <Button
          className='mb-6 inline-block w-full'
          variant='link'
          size='sm'
          onClick={() => setCurrentStep(1)}
        >
          {dict.workflow.create.goBack}
        </Button>
      </div>
    </div>
  );
}
