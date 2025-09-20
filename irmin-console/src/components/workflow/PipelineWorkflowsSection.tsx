'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import WorkflowWizardModal from '@/components/wizards/WorkflowWizardModal';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';
import { useResourceAllowed, useToggleCreateParam } from '@/hooks/utils';

import type { PipelineWorkflow } from '@/types/core/Workflow';

import PipelineWorkflowList from './PipelineWorkflowList';

/**
 * UI component to list and manage Pipeline Workflows in the workspace
 *
 * Uses {@link PipelineWorkflowList} to display the list of Pipeline Workflows
 * Uses {@link WorkflowWizardModal} to provide UI for new Pipeline Workflow creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
function PipelineWorkflowsSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const { workflowsQuery } = useWorkflows('pipeline');

  const [filteredItems, setFilteredItems] = useState<PipelineWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Set the initial items when the query data is available
  const initialDataSet = useRef(false);
  useEffect(() => {
    if (initialDataSet.current) return;
    if (!workflowsQuery.data?.data) return;
    initialDataSet.current = true;
    setFilteredItems((workflowsQuery.data?.data ?? []) as PipelineWorkflow[]);
  }, [workflowsQuery.data?.data]);

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilteredItems(
        (workflowsQuery.data?.data ?? []).filter(
          (item) =>
            item.type === 'pipeline' &&
            item.name
              .trim()
              .replace(/\s+/g, '')
              .toLowerCase()
              .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
        ) as PipelineWorkflow[]
      );
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, workflowsQuery.data?.data]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setCreateParam(false);
  }, [setCreateParam]);

  const openModal = useCallback(() => {
    setIsOpen(true);
    setCreateParam(true);
  }, [setCreateParam]);

  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <DisplayTitle>{dict.workflow.pipelineWorkflows}</DisplayTitle>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
          disabled={!isResourceAllowed('workflow', 'create')}
        >
          {dict.workflow.create.createNewPipelineWorkflow}
        </Button>
      </div>
      <WorkflowWizardModal
        isOpen={isOpen && isResourceAllowed('workflow', 'create')}
        closeModal={closeModal}
        workflowType='pipeline'
      />
      <div className='py-4'>
        <div
          className={`
            mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2
            text-gray-900
            focus:outline-hidden
            dark:bg-gray-800 dark:text-gray-200
          `}
        >
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              w-full bg-transparent p-2
              focus:outline-hidden
            `}
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        <PipelineWorkflowList
          loading={workflowsQuery.isLoading}
          pipelineWorkflows={filteredItems}
          emptyStateAction={
            isResourceAllowed('workflow', 'create')
              ? {
                  label: dict.workflow.create.createNewPipelineWorkflow,
                  onClick: openModal,
                  variant: 'gradient',
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default memo(PipelineWorkflowsSection);
