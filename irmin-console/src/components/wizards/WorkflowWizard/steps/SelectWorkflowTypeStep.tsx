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
    description: string;
  }[] = useMemo(
    () => [
      {
        type: 'pipeline',
        icon: <RiFlowChart size={20} />,
        label: dict.workflow.pipeline.pipeline,
        description: dict.workflow.create.typeDescription.pipeline,
      },
      {
        type: 'action',
        icon: <TbPlayerPlay size={20} />,
        label: dict.workflow.action,
        description: dict.workflow.create.typeDescription.action,
      },
      {
        type: 'import',
        icon: <TbDatabaseImport size={20} />,
        label: dict.workflow.import,
        description: dict.workflow.create.typeDescription.import,
      },
      {
        type: 'export',
        icon: <TbDatabaseExport size={20} />,
        label: dict.workflow.export,
        description: dict.workflow.create.typeDescription.export,
      },
    ],
    [dict]
  );

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      <div className='grid grid-cols-1 gap-3 py-2'>
        {workflowTypeOptions.map((option) => {
          const isSelected = wizardData.type === option.type;
          return (
            <button
              key={option.type}
              onClick={() => handleTypeSelect(option.type)}
              className={`
                group relative flex w-full items-start gap-4 rounded-xl border
                p-4 text-left transition-all
                hover:border-accent hover:bg-accent/10
                dark:hover:border-accent dark:hover:bg-accent/20
                ${
                  isSelected
                    ? `
                      border-accent bg-accent/10 ring-1 ring-accent
                      dark:border-accent dark:bg-accent/20 dark:ring-accent
                    `
                    : `
                      border-gray-200 bg-white
                      dark:border-gray-800 dark:bg-gray-950
                    `
                }
              `}
            >
              <div
                className={`
                  shrink-0 rounded-lg p-2.5 transition-colors
                  ${
                    isSelected
                      ? `
                        bg-accent/10 text-accent
                        dark:bg-accent/20 dark:text-accent
                      `
                      : `
                        bg-gray-100 text-gray-600
                        group-hover:bg-accent/10 group-hover:text-accent
                        dark:bg-gray-800 dark:text-gray-400
                        dark:group-hover:bg-accent/20
                        dark:group-hover:text-accent
                      `
                  }
                `}
              >
                {option.icon}
              </div>
              <div className='flex flex-col gap-1'>
                <span
                  className={`
                    font-medium transition-colors
                    ${
                      isSelected
                        ? `
                          text-accent-foreground
                          dark:text-accent
                        `
                        : `
                          text-gray-900
                          dark:text-gray-100
                        `
                    }
                  `}
                >
                  {option.label}
                </span>
                <span
                  className={`
                    text-sm/normal transition-colors
                    ${isSelected ? `text-accent` : `text-accent-foreground`}
                  `}
                >
                  {option.description}
                </span>
              </div>
            </button>
          );
        })}
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
