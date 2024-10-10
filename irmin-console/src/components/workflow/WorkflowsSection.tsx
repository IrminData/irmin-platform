'use client';

import { useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

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
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 * @param props0.onModalOpen - Callback when the modal is opened
 * @param props0.onModalClose - Callback when the modal is closed
 */
export default function WorkflowsSection({
  sideModalOpen = false,
  onModalOpen,
  onModalClose,
}: {
  sideModalOpen?: boolean;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) {
  const { dict } = useLocale();
  const { workspaceLoading, workflows } = useWorkspace();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const [filteredItems, setFilteredItems] = useState(workflows.allWorkflows);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (workflows.allWorkflows) {
        setFilteredItems(
          workflows.allWorkflows
            .filter((item) =>
              item.name
                .trim()
                .replace(/\s+/g, '')
                .toLowerCase()
                .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, workflows]);

  const closeModal = () => {
    if (onModalClose) {
      onModalClose();
    } else {
      setIsOpen(false);
    }
  };
  const openModal = () => {
    if (onModalOpen) {
      onModalOpen();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className='container relative mx-auto max-w-6xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
          {dict.workflow.allWorkflows}
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
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-none dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        <WorkflowList loading={workspaceLoading} workflows={filteredItems} />
      </div>
    </div>
  );
}
