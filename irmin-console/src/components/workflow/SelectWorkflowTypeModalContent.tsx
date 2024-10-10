'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
} from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { WorkflowableType } from '@/types/core/Workflow';

/**
 * Select the workflow type modal content and direct to the next step
 */
export default function SelectWorkflowTypeModalContent() {
  const { dict } = useLocale();
  const router = useRouter();

  const [workflowableType, setWorkflowableType] =
    useState<WorkflowableType | null>(null);

  const handleContinue = () => {
    // Direct to the next step
    if (workflowableType === 'action') {
      router.push('../workflows/actions/create');
    }
    if (workflowableType === 'import') {
      router.push('../workflows/imports/create');
    }
    if (workflowableType === 'export') {
      router.push('../workflows/exports/create');
    }
  };

  const workflowTypeOptions: {
    type: WorkflowableType;
    icon: JSX.Element;
    label: string;
  }[] = [
    {
      type: 'action',
      icon: <TbPlayerPlay size={18} className='mr-4' />,
      label: 'Action',
    },
    {
      type: 'import',
      icon: <TbDatabaseImport size={18} className='mr-4' />,
      label: 'Import',
    },
    {
      type: 'export',
      icon: <TbDatabaseExport size={18} className='mr-4' />,
      label: 'Export',
    },
  ];

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowTypeOptions.map((option, key) => (
          <Button
            key={`${option.type}-${key}`}
            onClick={() => setWorkflowableType(option.type)}
            size='lg'
            variant={workflowableType === option.type ? 'accent' : 'gray'}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='default'
          size='lg'
          onClick={handleContinue}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}
