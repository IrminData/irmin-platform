'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbPlus, TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { Input } from '@/components/ui/input';

import { useLocale } from '@/context/LocaleContext';

import { useAIApplications } from '@/hooks/api';
import {
  useDebouncedValue,
  useResourceAllowed,
  useToggleCreateParam,
} from '@/hooks/utils';

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
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

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
      titleKey='aiApplicationsInterfaceTitle'
      descriptionKey='aiApplicationsInterfaceDescription'
    >
      <div className='relative container mx-auto max-w-7xl px-4 py-8'>
        <div
          className={`
            my-4 flex flex-col items-stretch gap-4
            sm:flex-row sm:items-center sm:justify-between
          `}
        >
          <DisplayTitle>{dict.consoleNavigation.aiApplications}</DisplayTitle>
          <Button
            variant='accent'
            size='lg'
            onClick={() => openModal()}
            icon={<TbPlus aria-hidden='true' size={25} />}
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
          <Input
            type='search'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='mb-4'
            icon={<TbSearch aria-hidden='true' />}
            aria-label={dict.list.searchPlaceholder}
            placeholder={dict.list.searchPlaceholder}
          />
          {aiApplicationsQuery.error ? (
            <QueryError
              error={aiApplicationsQuery.error}
              onRetry={() => aiApplicationsQuery.refetch()}
              title={dict.common.errors.failedToLoadAIApplications}
              description={dict.common.errors.failedToLoadAgain}
            />
          ) : (
            <AIApplicationList
              hideActionButton={!isResourceAllowed('ai_application', 'create')}
              loading={aiApplicationsQuery.isLoading}
              aiApplications={filteredItems}
              emptyStateAction={
                isResourceAllowed('ai_application', 'create')
                  ? {
                      label: 'Create AI Application',
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
