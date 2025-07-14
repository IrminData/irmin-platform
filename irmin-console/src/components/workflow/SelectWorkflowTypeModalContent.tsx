'use client';

import { type JSX, useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { RiFlowChart } from 'react-icons/ri';
import {
  TbDatabaseExport,
  TbDatabaseImport,
  TbPlayerPlay,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import type { WorkflowableType } from '@/types/core/Workflow';

/**
 * Select the workflow type modal content and direct to the next step
 */
export default function SelectWorkflowTypeModalContent() {
  const { dict } = useLocale();
  const router = useRouter();

  const [workflowableType, setWorkflowableType] =
    useState<WorkflowableType | null>(null);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const handleContinue = useCallback(() => {
    // Direct to the next step
    if (workflowableType === 'action') {
      router.push(`${workspaceUrl}/workflows/actions?create`);
    }
    if (workflowableType === 'import') {
      router.push(`${workspaceUrl}/workflows/imports?create`);
    }
    if (workflowableType === 'export') {
      router.push(`${workspaceUrl}/workflows/exports?create`);
    }
    if (workflowableType === 'pipeline') {
      router.push(`${workspaceUrl}/workflows/pipelines?create`);
    }
  }, [router, workflowableType, workspaceUrl]);

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
            onClick={() => setWorkflowableType(option.type)}
            size='lg'
            variant={workflowableType === option.type ? 'accent' : 'gray'}
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
        <Button
          className='mb-6 inline-block w-full'
          variant='gradient'
          size='lg'
          onClick={handleContinue}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
      </div>
    </div>
  );
}
