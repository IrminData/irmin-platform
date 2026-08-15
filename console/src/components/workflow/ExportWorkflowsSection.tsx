'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbInfoCircle, TbPlus, TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { Input } from '@/components/ui/input';
import WorkflowWizardModal from '@/components/wizards/WorkflowWizardModal';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';
import {
  useDebouncedValue,
  useResourceAllowed,
  useToggleCreateParam,
} from '@/hooks/utils';

import type { ExportWorkflow } from '@/types/core/Workflow';

import ExportWorkflowList from './ExportWorkflowList';

/**
 * UI component to list and manage Export Workflows in the workspace
 *
 * Uses {@link ExportWorkflowList} to display the list of Export Workflows
 * Uses {@link WorkflowWizardModal} to provide UI for new Export Workflow creation
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

  const { workflowsQuery } = useWorkflows('export');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Filter items based on debounced search query
  const filteredItems = useMemo(
    () =>
      (workflowsQuery.data?.data ?? []).filter(
        (item) =>
          item.type === 'export' &&
          item.name
            .trim()
            .replace(/\s+/g, '')
            .toLowerCase()
            .includes(
              debouncedSearchQuery.trim().replace(/\s+/g, '').toLowerCase()
            )
      ) as ExportWorkflow[],
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
      <div
        className={`
          my-4 flex flex-col items-stretch gap-4
          sm:flex-row sm:items-center sm:justify-between
        `}
      >
        <DisplayTitle>{dict.workflow.exportWorkflows}</DisplayTitle>
        <Button
          variant='accent'
          size='lg'
          onClick={() => openModal()}
          icon={<TbPlus aria-hidden='true' size={25} />}
          disabled={!isResourceAllowed('workflow', 'create')}
        >
          {dict.workflow.create.createNewExportWorkflow}
        </Button>
      </div>
      <div
        className={`
          my-2 flex items-start gap-3 rounded-[2px] border border-accent/30
          bg-accent/10 p-3
          dark:border-accent-foreground dark:bg-accent/10
        `}
      >
        <TbInfoCircle
          aria-hidden='true'
          className='mt-0.5 size-5 shrink-0 text-accent'
        />
        <p className={`text-sm text-foreground`}>
          {dict.workflow.create.typeDescription.export}
        </p>
      </div>
      <WorkflowWizardModal
        isOpen={isOpen && isResourceAllowed('workflow', 'create')}
        closeModal={closeModal}
        workflowType='export'
      />
      <div className='py-4'>
        <Input
          type='search'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='mb-4'
          icon={<TbSearch aria-hidden='true' />}
          aria-label={dict.list.searchPlaceholder}
          placeholder={dict.list.searchPlaceholder}
        />
        <ExportWorkflowList
          loading={workflowsQuery.isLoading}
          exportWorkflows={filteredItems}
          emptyStateAction={
            isResourceAllowed('workflow', 'create')
              ? {
                  label: dict.workflow.create.createNewExportWorkflow,
                  onClick: openModal,
                  variant: 'accent',
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
