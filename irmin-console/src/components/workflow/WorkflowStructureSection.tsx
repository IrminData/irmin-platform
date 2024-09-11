'use client';

import { useLocale } from '@/context/LocaleContext';

import { Workflow } from '@/types/api/Workflow';

/**
 * Workflow Structure section component
 *
 * @param props0 - The props
 * @param props0.workflow - The workflow to editor the documentation for
 *
 * @todo Implement this component
 */
const WorkflowStructureSection = ({ workflow }: { workflow: Workflow }) => {
  const { dict } = useLocale();

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='px-2 md:px-4'>
        <div className='flex w-full flex-col gap-2 px-2'>
          <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
            {dict.workflow.tabs.settings}
          </h2>
          <p>{workflow.name}</p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStructureSection;
