'use client';

import { useCallback, useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useRepositories } from '@/hooks/useRepositories';
import { useToggleCreateParam } from '@/hooks/useToggleCreateParam';

import { Repository } from '@/types/core/Repository';

import CreateRepositoryModalContent from './CreateRepositoryModalContent';
import RepositoryList from './RepositoryList';

/**
 * UI component to list and manage Repositories in the workspace
 *
 * Uses {@link RepositoryList} to display the list of Repositories
 * Uses {@link SideModal} and {@link CreateRepositoryModalContent} to provide UI for new Repository creation
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
  const { setCreateParam } = useToggleCreateParam();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const { repositoriesQuery } = useRepositories();

  const [filteredItems, setFilteredItems] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (repositoriesQuery.data?.data) {
        setFilteredItems(
          repositoriesQuery.data.data.filter((item) =>
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
  }, [searchQuery, repositoriesQuery.data]);

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
        <h2 className='font-display text-foreground/90 text-3xl font-bold sm:text-4xl lg:text-5xl'>
          {dict.repository.repositories}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.repository.createNewRepository}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        title={dict.repository.createNewRepository}
      >
        <CreateRepositoryModalContent closeModal={closeModal} />
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
        <RepositoryList
          loading={repositoriesQuery.isLoading}
          repositories={filteredItems}
        />
      </div>
    </div>
  );
}
