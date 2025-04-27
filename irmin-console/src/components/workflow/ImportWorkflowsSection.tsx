'use client';

import { useCallback, useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useToggleCreateParam } from '@/hooks/useToggleCreateParam';

import { Connection } from '@/types/core/Connection';
import { EditorItem } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { ImportWorkflow, Workflow } from '@/types/core/Workflow';

import CreateWorkflowModalContent from './CreateWorkflowModalContent';
import ImportWorkflowList from './ImportWorkflowList';

/**
 * UI component to list and manage Import Workflows in the workspace
 *
 * Uses {@link ImportWorkflowList} to display the list of Import Workflows
 * Uses {@link SideModal} and {@link CreateWorkflowModalContent} to provide UI for new Import Workflow creation
 *
 * @param props0 - The props
 * @param props0.editorItems - The list of editor items
 * @param props0.connections - List of connections
 * @param props0.repositories - List of repositories
 * @param props0.workflows - List of workflows
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function ImportWorkflowsSection({
  editorItems,
  connections,
  repositories,
  workflows,
  sideModalOpen = false,
}: {
  editorItems: EditorItem[];
  connections: Connection[];
  repositories: Repository[];
  workflows: Workflow[];
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const [filteredItems, setFilteredItems] = useState(
    workflows.filter((w) => w.type === 'import')
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilteredItems(
        workflows.filter(
          (item) =>
            item.type === 'import' &&
            item.name
              .trim()
              .replace(/\s+/g, '')
              .toLowerCase()
              .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
        ) as ImportWorkflow[]
      );
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
    setCurrentStep(1);
    setIsOpen(true);
    setCreateParam(true);
  }, [setCreateParam]);

  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
          {dict.workflow.importWorkflows}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.workflow.create.createNewImportWorkflow}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.workflow.create.configureImport,
          dict.workflow.create.configureWorkflow,
        ]}
        title={dict.workflow.create.createNewImportWorkflow}
      >
        <CreateWorkflowModalContent
          editorItems={editorItems}
          connections={connections}
          repositories={repositories}
          workflows={workflows}
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
              type: 'import',
              connection: '',
              connection_path: '',
              repository: '',
              branch: '',
              path: '',
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
        <ImportWorkflowList loading={false} importWorkflows={filteredItems} />
      </div>
    </div>
  );
}
