'use client';

import { type JSX, useCallback, useMemo } from 'react';

import { RiFlowChart } from 'react-icons/ri';
import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import type { WorkflowableType } from '@/types/core/Workflow';

import type { WorkflowWizardData } from '../types';

/**
 * Step component for selecting the workflow type
 */
function SelectWorkflowTypeStep({
  wizardData,
  updateWizardData,
  goNext,
  onCancel,
}: {
  wizardData: WorkflowWizardData;
  updateWizardData: (updates: Partial<WorkflowWizardData>) => void;
  goNext: () => void;
  onCancel?: () => void;
}) {
  const { dict } = useLocale();

  const handleTypeSelect = useCallback(
    (type: WorkflowableType) => {
      updateWizardData({ type });
    },
    [updateWizardData]
  );

  const handleContinue = useCallback(() => {
    if (wizardData.type) {
      goNext();
    }
  }, [wizardData.type, goNext]);

  const workflowTypeOptions: {
    type: WorkflowableType;
    icon: JSX.Element;
    label: string;
  }[] = useMemo(
    () => [
      {
        type: 'action',
        icon: <TbPlayerPlay size={18} className='mr-4' />,
        label: dict.workflow.action,
      },
      {
        type: 'import',
        icon: <TbDatabaseImport size={18} className='mr-4' />,
        label: dict.workflow.import,
      },
      {
        type: 'export',
        icon: <TbDatabaseExport size={18} className='mr-4' />,
        label: dict.workflow.export,
      },
      {
        type: 'pipeline',
        icon: <RiFlowChart size={18} className='mr-4' />,
        label: dict.workflow.pipeline.pipeline,
      },
    ],
    [dict]
  );

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowTypeOptions.map((option) => (
          <Button
            key={option.type}
            onClick={() => handleTypeSelect(option.type)}
            size='lg'
            variant={wizardData.type === option.type ? 'accent' : 'gray'}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>
      <div className='grow' />
      <div
        className={`
          mt-auto border-t pt-4
          dark:border-gray-800
        `}
      >
        {onCancel && (
          <Button
            className='mb-3 inline-block w-full'
            variant='secondary'
            size='lg'
            onClick={onCancel}
          >
            {dict.common.cancel}
          </Button>
        )}
        <Button
          className='mb-6 inline-block w-full'
          variant='gradient'
          size='lg'
          onClick={handleContinue}
          disabled={!wizardData.type}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}

export default SelectWorkflowTypeStep;
