'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { Connection } from '@/types/core/Connection';
import { EditorItems } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { PipelineWorkflow } from '@/types/core/Workflow';

import CreateWorkflowModalContent from './CreateWorkflowModalContent';
import PipelineWorkflowList from './PipelineWorkflowList';

/**
 * UI component to list and manage Pipeline Workflows in the workspace
 *
 * Uses {@link PipelineWorkflowList} to display the list of Pipeline Workflows
 * Uses {@link SideModal} and {@link CreateWorkflowModalContent} to provide UI for new Pipeline Workflow creation
 *
 * @param props0 - The props
 * @param props0.editorItems - The list of editor items
 * @param props0.connections - List of connections
 * @param props0.repositories - List of repositories
 * @param props0.workflows - The list of Pipeline Workflows
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function PipelineWorkflowsSection({
  editorItems,
  connections,
  repositories,
  workflows,
  sideModalOpen = false,
}: {
  editorItems: EditorItems;
  connections: Connection[];
  repositories: Repository[];
  workflows: PipelineWorkflow[];
  sideModalOpen?: boolean;
}) {
  const router = useRouter();
  const { dict } = useLocale();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const [filteredItems, setFilteredItems] = useState(workflows);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilteredItems(
        workflows.filter((item) =>
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
  }, [searchQuery, workflows]);

  const closeModal = () => {
    if (sideModalOpen) {
      router.push('../pipelines');
    } else {
      setIsOpen(false);
    }
  };
  const openModal = () => {
    if (!sideModalOpen) {
      router.push('pipelines/create');
    } else {
      setIsOpen(true);
      setCurrentStep(1);
    }
  };

  return (
    <div className='relative container mx-auto max-w-6xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-opacity-80 text-3xl font-bold sm:text-4xl lg:text-5xl'>
          {dict.workflow.pipelineWorkflows}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.workflow.create.createNewPipelineWorkflow}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.workflow.create.configurePipeline,
          dict.workflow.create.configureWorkflow,
        ]}
        title={dict.workflow.create.createNewPipelineWorkflow}
      >
        <CreateWorkflowModalContent
          editorItems={editorItems}
          connections={connections}
          repositories={repositories}
          isOpen={isOpen}
          closeModal={closeModal}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          workflowType={'pipeline'}
        />
      </SideModal>
      <div className='py-4'>
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-hidden dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        <PipelineWorkflowList
          loading={false}
          pipelineWorkflows={filteredItems}
        />
      </div>
    </div>
  );
}
