'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
} from 'react-icons/tb';

import Button from '@/components/common/button/Button';

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
      icon: <TbPlayerPlay className='h-12 w-12' />,
      label: 'Action',
    },
    {
      type: 'import',
      icon: <TbDatabaseImport className='h-12 w-12' />,
      label: 'Import',
    },
    {
      type: 'export',
      icon: <TbDatabaseExport className='h-12 w-12' />,
      label: 'Export',
    },
  ];

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='flex flex-col gap-4 py-4'>
        {workflowTypeOptions.map((option, key) => (
          <button
            key={`${option.type}-${key}`}
            type='button'
            className={`flex w-full flex-row items-center justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left text-sm text-irmin_black shadow transition-all hover:opacity-80 dark:bg-gray-800 dark:text-gray-200 ${
              workflowableType === option.type
                ? 'outline outline-gray-800 dark:outline-gray-200'
                : ''
            } `}
            onClick={() => setWorkflowableType(option.type)}
          >
            {option.icon}
            <p>{option.label}</p>
          </button>
        ))}
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='mb-6 inline-block w-full'
          variant='solid'
          colorScheme='primary'
          size='md'
          onClick={handleContinue}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}
