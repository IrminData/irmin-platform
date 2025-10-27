'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import WorkflowWizardModal from '@/components/wizards/WorkflowWizardModal';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';
import { useResourceAllowed, useToggleCreateParam } from '@/hooks/utils';

import type { ActionWorkflow } from '@/types/core/Workflow';

import ActionWorkflowList from './ActionWorkflowList';

/**
 * UI component to list and manage Action Workflows in the workspace
 *
 * Uses {@link ActionWorkflowList} to display the list of Action Workflows
 * Uses {@link WorkflowWizardModal} to provide UI for new Action Workflow creation
 *
 * @param props - The props
 * @param props.sideModalOpen - Whether the side modal is open by default or not
 */
export default function ActionWorkflowsSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const { workflowsQuery } = useWorkflows('action');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Filter items based on debounced search query
  const filteredItems = useMemo(
    () =>
      (workflowsQuery.data?.data ?? []).filter(
        (item) =>
          item.type === 'action' &&
          item.name
            .trim()
            .replace(/\s+/g, '')
            .toLowerCase()
            .includes(
              debouncedSearchQuery.trim().replace(/\s+/g, '').toLowerCase()
            )
      ) as ActionWorkflow[],
    [workflowsQuery.data?.data, debouncedSearchQuery]
  );

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
        <DisplayTitle>{dict.workflow.actionWorkflows}</DisplayTitle>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
          disabled={!isResourceAllowed('workflow', 'create')}
        >
          {dict.workflow.create.createNewActionWorkflow}
        </Button>
      </div>
      <WorkflowWizardModal
        isOpen={isOpen && isResourceAllowed('workflow', 'create')}
        closeModal={closeModal}
        workflowType='action'
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
        <ActionWorkflowList
          loading={workflowsQuery.isLoading}
          actionWorkflows={filteredItems}
          emptyStateAction={
            isResourceAllowed('workflow', 'create')
              ? {
                  label: dict.workflow.create.createNewActionWorkflow,
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
