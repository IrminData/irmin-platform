'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';
import { useResourceAllowed, useToggleCreateParam } from '@/hooks/utils';

import type { Workflow } from '@/types/core/Workflow';

import SelectWorkflowTypeModalContent from './SelectWorkflowTypeModalContent';
import WorkflowList from './WorkflowList';

/**
 * UI component to list and manage Workflows in the workspace
 *
 * Uses {@link WorkflowList} to display the list of Workflows.
 * Uses {@link SideModal} and {@link SelectWorkflowTypeModalContent} to provide UI for workflow type
 * selection. After selecting the workflow type, the user is redirected to the appropriate workflow
 * creation modal.
 *
 * @param props - The props
 * @param props.sideModalOpen - Whether the side modal is open by default or not
 */
export default function WorkflowsSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const { workflowsQuery } = useWorkflows();

  const [filteredItems, setFilteredItems] = useState<Workflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Set the initial items when the query data is available
  const initialDataSet = useRef(false);
  useEffect(() => {
    if (initialDataSet.current) return;
    if (!workflowsQuery.data?.data) return;
    initialDataSet.current = true;
    setFilteredItems((workflowsQuery.data?.data ?? []) as Workflow[]);
  }, [workflowsQuery.data?.data]);

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilteredItems(
        (workflowsQuery.data?.data ?? []).filter((item) =>
          item.name
            .trim()
            .replace(/\s+/g, '')
            .toLowerCase()
            .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
        )
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
    <SafeComponent
      level='section'
      title='Workflows Interface Error'
      description='Failed to load workflows interface'
    >
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div className='my-4 flex flex-row items-center justify-between gap-4'>
          <DisplayTitle>{dict.workflow.workflows}</DisplayTitle>
          <Button
            variant='gradient'
            size='lg'
            onClick={() => openModal()}
            icon={<IoAdd size={25} />}
            disabled={!isResourceAllowed('workflow', 'create')}
          >
            {dict.workflow.create.createNewWorkflow}
          </Button>
        </div>
        <SideModal
          isOpen={isOpen && isResourceAllowed('workflow', 'create')}
          closeModal={closeModal}
          title={dict.workflow.create.createNewWorkflow}
        >
          <SelectWorkflowTypeModalContent />
        </SideModal>
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
          {workflowsQuery.error ? (
            <QueryError
              error={workflowsQuery.error}
              onRetry={() => workflowsQuery.refetch()}
              title={dict.common.somethingWentWrong}
            />
          ) : (
            <WorkflowList
              loading={workflowsQuery.isLoading}
              workflows={filteredItems}
              emptyStateAction={
                isResourceAllowed('workflow', 'create')
                  ? {
                      label: dict.workflow.create.createNewWorkflow,
                      onClick: openModal,
                      variant: 'gradient',
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </SafeComponent>
  );
}
