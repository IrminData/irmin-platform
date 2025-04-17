'use client';

import { useCallback, useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { Connection } from '@/types/core/Connection';
import { EditorItem } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { ActionWorkflow } from '@/types/core/Workflow';

import ActionWorkflowList from './ActionWorkflowList';
import CreateWorkflowModalContent from './CreateWorkflowModalContent';

/**
 * UI component to list and manage Action Workflows in the workspace
 *
 * Uses {@link ActionWorkflowList} to display the list of Action Workflows
 * Uses {@link SideModal} and {@link CreateWorkflowModalContent} to provide UI for new Action Workflow creation
 *
 * @param props0 - The props
 * @param props0.editorItems - The list of editor items
 * @param props0.connections - List of connections
 * @param props0.repositories - List of repositories
 * @param props0.workflows - The list of Action Workflows
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function ActionWorkflowsSection({
  editorItems,
  connections,
  repositories,
  workflows,
  sideModalOpen = false,
}: {
  editorItems: EditorItem[];
  connections: Connection[];
  repositories: Repository[];
  workflows: ActionWorkflow[];
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

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
  }, []);

  const openModal = useCallback(() => {
    setCurrentStep(1);
    setIsOpen(true);
  }, []);

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
          editorItems={editorItems}
          connections={connections}
          repositories={repositories}
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
        <ActionWorkflowList loading={false} actionWorkflows={filteredItems} />
      </div>
    </div>
  );
}
