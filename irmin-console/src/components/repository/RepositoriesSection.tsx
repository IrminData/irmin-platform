'use client';

import { useCallback, useMemo, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';
import RepositoryWizardModal from '@/components/wizards/RepositoryWizardModal';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/api';
import {
  useDebouncedValue,
  useResourceAllowed,
  useToggleCreateParam,
} from '@/hooks/utils';

import RepositoryList from './RepositoryList';

/**
 * UI component to list and manage Repositories in the workspace
 *
 * Uses {@link RepositoryList} to display the list of Repositories
 * Uses {@link RepositoryWizardModal} to provide UI for new Repository creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function RepositoriesSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const { repositoriesQuery } = useRepositories();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Filter items based on debounced search query
  const filteredItems = useMemo(
    () =>
      (repositoriesQuery.data?.data ?? []).filter((item) =>
        item.name
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase()
          .includes(
            debouncedSearchQuery.trim().replace(/\s+/g, '').toLowerCase()
          )
      ),
    [repositoriesQuery.data?.data, debouncedSearchQuery]
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
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <DisplayTitle>{dict.repository.repositories}</DisplayTitle>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
          disabled={!isResourceAllowed('repository', 'create')}
        >
          {dict.repository.createNewRepository}
        </Button>
      </div>
      <RepositoryWizardModal
        isOpen={isOpen && isResourceAllowed('repository', 'create')}
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
        {repositoriesQuery.error ? (
          <QueryError
            error={repositoriesQuery.error}
            onRetry={() => repositoriesQuery.refetch()}
            title={dict.common.somethingWentWrong}
          />
        ) : (
          <RepositoryList
            loading={repositoriesQuery.isLoading}
            repositories={filteredItems}
            emptyStateAction={
              isResourceAllowed('repository', 'create')
                ? {
                    label: dict.repository.createNewRepository,
                    onClick: openModal,
                    variant: 'gradient',
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
