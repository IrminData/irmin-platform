'use client';

import { useEffect, useState } from 'react';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/Button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import ConnectionList from './ConnectionList';
import CreateConnectionModalContent from './CreateConnectionModalContent';

/**
 * UI component to list and manage Connections in the workspace
 *
 * Uses {@link ConnectionList} to display the list of Connections
 * Uses {@link SideModal} and {@link CreateConnectionModalContent} to provide UI for new Connection creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 * @param props0.onModalOpen - Callback when the modal is opened
 * @param props0.onModalClose - Callback when the modal is closed
 */
export default function ConnectionsSection({
  sideModalOpen = false,
  onModalOpen,
  onModalClose,
}: {
  sideModalOpen?: boolean;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) {
  const { dict } = useLocale();
  const { workspaceLoading, connections } = useWorkspace();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const [filteredItems, setFilteredItems] = useState(connections.connections);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (connections.connections) {
        setFilteredItems(
          connections.connections.filter((item) =>
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
  }, [searchQuery, connections]);

  const loading = workspaceLoading || connections.isLoading;

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
      setCurrentStep(1);
    }
  };

  return (
    <div className='container relative mx-auto max-w-6xl px-4 py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4'>
        <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
          {dict.consoleNavigation.links.connections}
        </h2>
        <Button
          variant='gradient'
          size='lg'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.connections.create.createNewConnection}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.connections.create.selectConnector,
          dict.connections.create.establishConnection,
          dict.connections.create.configureSettings,
          dict.connections.create.configureConnection,
        ]}
        title={dict.connections.create.createNewConnection}
      >
        <CreateConnectionModalContent
          isOpen={isOpen}
          closeModal={closeModal}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      <div className='py-4'>
        <div className='mb-4 flex w-full items-center gap-2 rounded-md bg-gray-100 p-2 text-gray-900 focus:outline-none dark:bg-gray-800 dark:text-gray-200'>
          <TbSearch />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-transparent p-2'
            placeholder={dict.list.searchPlaceholder}
          />
        </div>
        <ConnectionList loading={loading} connections={filteredItems} />
      </div>
    </div>
  );
}
