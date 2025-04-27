'use client';

import { useCallback, useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useToggleCreateParam } from '@/hooks/useToggleCreateParam';

import { Workflow } from '@/types/core/Workflow';

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
 * @param props0 - The props
 * @param props0.workflows - The list of workflows to display
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function WorkflowsSection({
  workflows,
  sideModalOpen = false,
}: {
  workflows: Workflow[];
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const [filteredItems, setFilteredItems] = useState(workflows);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (workflows) {
        setFilteredItems(
          workflows.filter((item) =>
            item.name
              .trim()
              .replace(/\s+/g, '')
              .toLowerCase()
              .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
          )
        );
      }
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, workflows]);

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
        <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
          {dict.workflow.workflows}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.workflow.create.createNewWorkflow}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        title={dict.workflow.create.createNewWorkflow}
      >
        <SelectWorkflowTypeModalContent />
      </SideModal>
      <div className='py-4'>
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-hidden dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2 focus:outline-hidden'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        <WorkflowList loading={false} workflows={filteredItems} />
      </div>
    </div>
  );
}
