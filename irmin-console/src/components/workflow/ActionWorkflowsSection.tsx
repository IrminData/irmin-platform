'use client';

import { useCallback, useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useToggleCreateParam } from '@/hooks/useToggleCreateParam';
import { useWorkflows } from '@/hooks/useWorkflows';

import { ActionWorkflow } from '@/types/core/Workflow';

import ActionWorkflowList from './ActionWorkflowList';
import CreateWorkflowModalContent from './CreateWorkflowModalContent';

/**
 * UI component to list and manage Action Workflows in the workspace
 *
 * Uses {@link ActionWorkflowList} to display the list of Action Workflows
 * Uses {@link SideModal} and {@link CreateWorkflowModalContent} to provide UI for new Action Workflow creation
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
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const { workflowsQuery } = useWorkflows('action');

  const [filteredItems, setFilteredItems] = useState<ActionWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (workflowsQuery.data?.data) {
        setFilteredItems(
          workflowsQuery.data.data.filter(
            (item) =>
              item.type === 'action' &&
              item.name
                .trim()
                .replace(/\s+/g, '')
                .toLowerCase()
                .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
          ) as ActionWorkflow[]
        );
      }
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
    setCurrentStep(1);
    setIsOpen(true);
    setCreateParam(true);
  }, [setCreateParam]);

  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
          {dict.workflow.actionWorkflows}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.workflow.create.createNewActionWorkflow}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.workflow.create.configureAction,
          dict.workflow.create.configureWorkflow,
        ]}
        title={dict.workflow.create.createNewActionWorkflow}
      >
        <CreateWorkflowModalContent
          isOpen={isOpen}
          closeModal={closeModal}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          initialWorkflowData={{
            // Workflow properties
            name: '',
            description: '',
            documentation: '',
            schedule: {
              triggers: [],
              max_retries: 3,
              max_runtime: 15,
              min_interval: 120,
            },
            // Workflowable properties
            workflowable: {
              type: 'action',
              executable: '',
            },
          }}
        />
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
        <ActionWorkflowList
          loading={workflowsQuery.isLoading}
          actionWorkflows={filteredItems}
        />
      </div>
    </div>
  );
}
