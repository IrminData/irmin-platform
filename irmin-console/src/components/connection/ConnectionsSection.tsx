'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import DisplayTitle from '@/components/ui/display-title';
import { QueryError } from '@/components/ui/error/QueryError';

import { useLocale } from '@/context/LocaleContext';

import { useConnections } from '@/hooks/api';
import { useResourceAllowed, useToggleCreateParam } from '@/hooks/utils';

import ConnectionWizardModal from '../wizards/ConnectionWizardModal';
import ConnectionList from './ConnectionList';

/**
 * UI component to list and manage Connections in the workspace
 *
 * Uses {@link ConnectionList} to display the list of Connections
 * Uses {@link ConnectionWizardModal} to provide UI for new Connection creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function ConnectionsSection({
  sideModalOpen = false,
}: {
  sideModalOpen?: boolean;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const { connectionsQuery } = useConnections();

  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

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
      (connectionsQuery.data?.data ?? []).filter((item) =>
        item.name
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase()
          .includes(
            debouncedSearchQuery.trim().replace(/\s+/g, '').toLowerCase()
          )
      ),
    [connectionsQuery.data?.data, debouncedSearchQuery]
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
        <DisplayTitle>{dict.connections.connections}</DisplayTitle>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
          disabled={!isResourceAllowed('connection', 'create')}
        >
          {dict.connections.create.createNewConnection}
        </Button>
      </div>
      <ConnectionWizardModal
        isOpen={isOpen && isResourceAllowed('connection', 'create')}
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
        {connectionsQuery.error ? (
          <QueryError
            error={connectionsQuery.error}
            onRetry={() => connectionsQuery.refetch()}
            title={dict.common.somethingWentWrong}
          />
        ) : (
          <ConnectionList
            loading={connectionsQuery.isLoading}
            connections={filteredItems}
            emptyStateAction={
              isResourceAllowed('connection', 'create')
                ? {
                    label: dict.connections.create.createNewConnection,
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
