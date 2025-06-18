'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useToggleCreateParam } from '@/hooks/useToggleCreateParam';
import { useWorkflows } from '@/hooks/useWorkflows';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import { ExportWorkflow } from '@/types/core/Workflow';

import CreateWorkflowModalContent from './CreateWorkflowModalContent';
import ExportWorkflowList from './ExportWorkflowList';

/**
 * UI component to list and manage Export Workflows in the workspace
 *
 * Uses {@link ExportWorkflowList} to display the list of Export Workflows
 * Uses {@link SideModal} and {@link CreateWorkflowModalContent} to provide UI for new Export Workflow creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function ExportWorkflowsSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const { workflowsQuery } = useWorkflows('export');

  const [filteredItems, setFilteredItems] = useState<ExportWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Set the initial items when the query data is available
  const initialDataSet = useRef(false);
  useEffect(() => {
    if (initialDataSet.current) return;
    if (!workflowsQuery.data?.data) return;
    initialDataSet.current = true;
    setFilteredItems((workflowsQuery.data?.data ?? []) as ExportWorkflow[]);
  }, [workflowsQuery.data?.data]);

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilteredItems(
        (workflowsQuery.data?.data ?? []).filter(
          (item) =>
            item.type === 'export' &&
            item.name
              .trim()
              .replace(/\s+/g, '')
              .toLowerCase()
              .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
        ) as ExportWorkflow[]
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
    setCurrentStep(1);
    setIsOpen(true);
    setCreateParam(true);
  }, [setCreateParam]);

  return (
    <div className='relative container mx-auto max-w-7xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
          {dict.workflow.exportWorkflows}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
          disabled={
            !isResourceAllowed(PolicyResource.Workflow, PolicyAction.Create)
          }
        >
          {dict.workflow.create.createNewExportWorkflow}
        </Button>
      </div>
      <SideModal
        isOpen={
          isOpen &&
          isResourceAllowed(PolicyResource.Workflow, PolicyAction.Create)
        }
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.workflow.create.configureExport,
          dict.workflow.create.configureWorkflow,
        ]}
        title={dict.workflow.create.createNewExportWorkflow}
      >
        <CreateWorkflowModalContent
          isOpen={
            isOpen &&
            isResourceAllowed(PolicyResource.Workflow, PolicyAction.Create)
          }
          closeModal={closeModal}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          initialWorkflowData={{
            // Workflow properties
            name: '',
            description: '',
            documentation: '',
            type: 'export',
            schedule: {
              triggers: [],
              max_retries: 3,
              max_runtime: 15,
              min_interval: 120,
            },
            // Workflowable properties
            workflowable: {
              type: 'export',
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
        <ExportWorkflowList
          loading={workflowsQuery.isLoading}
          exportWorkflows={filteredItems}
        />
      </div>
    </div>
  );
}
