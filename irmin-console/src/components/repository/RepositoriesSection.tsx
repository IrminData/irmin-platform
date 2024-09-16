'use client';

import { useState } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import SideModal from '@/components/common/popup/SideModal';
import CreateRepositoryModalContent from '@/components/repository/CreateRepositoryModalContent';
import RepositoryList from '@/components/repository/RepositoryList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * UI component to list and manage Repositories in the workspace
 *
 * Uses {@link RepositoryList} to display the list of Repositories
 * Uses {@link SideModal} and {@link CreateRepositoryModalContent} to provide UI for new Repository creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 * @param props0.onModalOpen - Callback when the modal is opened
 * @param props0.onModalClose - Callback when the modal is closed
 */
export default function RepositoriesSection({
  sideModalOpen = false,
  onModalOpen,
  onModalClose,
}: {
  sideModalOpen?: boolean;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) {
  const { dict } = useLocale();
  const { workspaceLoading, repositories } = useWorkspace();

  const [isOpen, setIsOpen] = useState(sideModalOpen);

  const loading = workspaceLoading || repositories.isLoading;

  const closeModal = () => {
    if (onModalClose) {
      onModalClose();
    } else {
      setIsOpen(false);
    }
  };
  const openModal = () => {
    if (onModalOpen) {
      onModalOpen();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className='container relative mx-auto max-w-6xl py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4 px-4'>
        <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
          {dict.portalNavigation.links.repositories}
        </h2>
        <Button
          colorScheme='primary'
          variant='solid'
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
      <RepositoryList
        loading={loading}
        repositories={repositories.repositories}
      />
    </div>
  );
}
