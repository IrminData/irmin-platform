'use client';

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import type { RepositoryWizardData } from '../types';

/**
 * Step component for reviewing and completing repository creation
 */
export default function ReviewAndCreateStep({
  wizardData,
  goBack,
  closeModal,
}: {
  wizardData: RepositoryWizardData;
  goBack: () => void;
  closeModal: () => void;
}) {
  const { dict } = useLocale();

  const handleComplete = useCallback(() => {
    closeModal();
  }, [closeModal]);

  return (
    <div className='flex flex-col gap-4 px-4 py-8'>
      <div className='flex flex-col gap-2'>
        <h3 className='text-lg font-semibold'>{dict.common.view}</h3>
        <div className='rounded-[2px] border bg-card p-4'>
          <div className='space-y-2'>
            <div>
              <span className='font-medium'>{dict.common.name}:</span>
              <span className='ml-2'>{wizardData.name}</span>
            </div>
            <div>
              <span className='font-medium'>{dict.common.description}:</span>
              <span className='ml-2'>{wizardData.description}</span>
            </div>
            <div>
              <span className='font-medium'>
                {dict.repository.branches.primaryBranch}:
              </span>
              <span className='ml-2'>{wizardData.default_branch}</span>
            </div>
          </div>
        </div>
      </div>

      <div className='flex gap-2'>
        <Button variant='secondary' onClick={goBack} className='flex-1'>
          {dict.common.back}
        </Button>
        <Button variant='accent' onClick={handleComplete} className='flex-1'>
          {dict.common.confirm}
        </Button>
      </div>
    </div>
  );
}
