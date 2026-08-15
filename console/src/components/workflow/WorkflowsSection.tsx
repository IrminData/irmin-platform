'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbPlus, TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { Input } from '@/components/ui/input';
import WorkflowWizardModal from '@/components/wizards/WorkflowWizardModal';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflows } from '@/hooks/api';
import {
  useDebouncedValue,
  useResourceAllowed,
  useToggleCreateParam,
} from '@/hooks/utils';

import WorkflowList from './WorkflowList';

/**
 * UI component to list and manage Workflows in the workspace
 *
 * Uses {@link WorkflowList} to display the list of Workflows.
 * Uses {@link WorkflowWizardModal} to provide creation modal for all workflow types.
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

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Filter items based on debounced search query
  const filteredItems = useMemo(
    () =>
      (workflowsQuery.data?.data ?? []).filter((item) =>
        item.name
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase()
          .includes(
            debouncedSearchQuery.trim().replace(/\s+/g, '').toLowerCase()
          )
      ),
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
    <SafeComponent
      level='section'
      titleKey='workflowsInterfaceTitle'
      descriptionKey='workflowsInterfaceDescription'
    >
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div
          className={`
            my-4 flex flex-col items-stretch gap-4
            sm:flex-row sm:items-center sm:justify-between
          `}
        >
          <DisplayTitle>{dict.workflow.workflows}</DisplayTitle>
          <Button
            variant='accent'
            size='lg'
            onClick={() => openModal()}
            icon={<TbPlus aria-hidden='true' size={25} />}
            disabled={!isResourceAllowed('workflow', 'create')}
          >
            {dict.workflow.create.createNewWorkflow}
          </Button>
        </div>
        <WorkflowWizardModal
          isOpen={isOpen && isResourceAllowed('workflow', 'create')}
          closeModal={closeModal}
          workflowType={undefined}
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
          {workflowsQuery.error ? (
            <QueryError
              error={workflowsQuery.error}
              onRetry={() => workflowsQuery.refetch()}
              title={dict.common.errors.failedToLoadWorkflows}
              description={dict.common.errors.failedToLoadAgain}
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
                      variant: 'accent',
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
