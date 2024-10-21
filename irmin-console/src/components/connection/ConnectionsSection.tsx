'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { IoAdd } from 'react-icons/io5';
import { TbSearch } from 'react-icons/tb';

import Button from '@/components/ui/button';
import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { Connection } from '@/types/core/Connection';
import { Connector } from '@/types/core/Connector';

import ConnectionList from './ConnectionList';
import CreateConnectionModalContent from './CreateConnectionModalContent';

/**
 * UI component to list and manage Connections in the workspace
 *
 * Uses {@link ConnectionList} to display the list of Connections
 * Uses {@link SideModal} and {@link CreateConnectionModalContent} to provide UI for new Connection creation
 *
 * @param props0 - The props
 * @param props0.connections - The list of Connections
 * @param props0.connectors - List of available connectors
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 */
export default function ConnectionsSection({
  connections,
  connectors,
  sideModalOpen = false,
}: {
  connections: Connection[];
  connectors: Connector[];
  sideModalOpen?: boolean;
}) {
  const router = useRouter();
  const { dict } = useLocale();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const [filteredItems, setFilteredItems] = useState(connections);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (connections) {
        setFilteredItems(
          connections.filter((item) =>
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

  const closeModal = () => {
    if (sideModalOpen) {
      router.push('../connections');
    } else {
      setIsOpen(false);
    }
  };
  const openModal = () => {
    if (!sideModalOpen) {
      router.push('connections/create');
    } else {
      setIsOpen(true);
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
          connectors={connectors}
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
        <ConnectionList connections={filteredItems} />
      </div>
    </div>
  );
}
