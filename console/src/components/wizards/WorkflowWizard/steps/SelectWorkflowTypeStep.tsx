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
              type='button'
              aria-pressed={isSelected}
              onClick={() => handleTypeSelect(option.type)}
              className={`
                group relative flex w-full items-start gap-4 rounded-[2px]
                border p-4 text-left transition-[border-color,background-color]
                duration-150
                hover:border-accent/60 hover:bg-accent/5
                ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-card'
                }
              `}
            >
              <div
                className={`
                  shrink-0 rounded-[2px] p-2.5 transition-colors duration-150
                  ${
                    isSelected
                      ? 'bg-accent/15 text-accent'
                      : `
                        bg-muted text-muted-foreground
                        group-hover:text-accent
                      `
                  }
                `}
              >
                {option.icon}
              </div>
              <div className='flex flex-col gap-1'>
                <span
                  className={`
                    font-medium transition-colors duration-150
                    ${isSelected ? 'text-foreground' : 'text-foreground'}
                  `}
                >
                  {option.label}
                </span>
                <span className='text-sm/normal text-muted-foreground'>
                  {option.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className='grow' />
      <div className='mt-auto border-t border-border pt-4'>
        <Button
          className='mb-2 w-full'
          variant='accent'
          size='lg'
          onClick={handleContinue}
          disabled={!wizardData.type}
        >
          {dict.workflow.create.confirmAndContinue}
        </Button>
        {onCancel && (
          <Button
            className='mb-6 w-full'
            variant='ghost'
            size='lg'
            onClick={onCancel}
          >
            {dict.common.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}

export default SelectWorkflowTypeStep;
