'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';

import { useLocale } from '@/context/LocaleContext';

import { useAIApplications } from '@/hooks/api';
import { useResourceAllowed, useToggleCreateParam } from '@/hooks/utils';

import AIApplicationList from './AIApplicationList';
import CreateAIApplicationModal from './CreateAIApplicationModal';

/**
 * UI component to list and manage AI Applications in the workspace
 *
 * @param props - The props
 * @param props.sideModalOpen - Whether the side modal is open by default or not
 */
export default function AIApplicationsSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const { aiApplicationsQuery } = useAIApplications();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Filter items based on debounced search query
  const filteredItems = useMemo(
    () =>
      (aiApplicationsQuery.data?.data ?? []).filter((item) =>
        item.name
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase()
          .includes(
            debouncedSearchQuery.trim().replace(/\s+/g, '').toLowerCase()
          )
      ),
    [aiApplicationsQuery.data?.data, debouncedSearchQuery]
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
      title='AI Applications Interface Error'
      description='Failed to load AI Applications interface'
    >
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div className='my-4 flex flex-row items-center justify-between gap-4'>
          <DisplayTitle>{dict.consoleNavigation.aiApplications}</DisplayTitle>
          <Button
            variant='gradient'
            size='lg'
            onClick={() => openModal()}
            icon={<IoAdd size={25} />}
            disabled={!isResourceAllowed('ai_application', 'create')}
          >
            {dict.aiApplication.createAIApplication}
          </Button>
        </div>
        <CreateAIApplicationModal
          isOpen={isOpen && isResourceAllowed('ai_application', 'create')}
          closeModal={closeModal}
        />
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
          {aiApplicationsQuery.error ? (
            <QueryError
              error={aiApplicationsQuery.error}
              onRetry={() => aiApplicationsQuery.refetch()}
              title={dict.common.somethingWentWrong}
            />
          ) : (
            <AIApplicationList
              loading={aiApplicationsQuery.isLoading}
              aiApplications={filteredItems}
              emptyStateAction={
                isResourceAllowed('ai_application', 'create')
                  ? {
                      label: 'Create AI Application',
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
