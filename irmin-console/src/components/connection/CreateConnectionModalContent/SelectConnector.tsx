'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { MdOutlineSupportAgent } from 'react-icons/md';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connector } from '@/types/api/Connector';

import { ConnectionSetup } from '.';

export default function SelectConnector({
  connectors,
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: Connector[];
  connectionData: ConnectionSetup;
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const [filteredConnectors, setFilteredConnectors] = useState<Connector[]>(
    connectors.sort((a, b) => a.name.localeCompare(b.name))
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    dict.connections.create.categoryAll
  );
  const categoryFilterOptions = [
    dict.connections.create.categoryAll,
    ...new Set(connectors.map((connector) => connector.category)),
  ];

  const handleConnectorClick = (connector: Connector) => {
    setConnectionData((prev) => ({
      ...prev,
      connector: connector,
    }));
  };
  const handleContinue = () => {
    if (connectionData.connector === null) {
      irminAlert('error', dict.connections.create.pleaseSelectConnector);
      return;
    }
    setCurrentStep(2);
  };
  const selectCategoryFilter = (category: string) => {
    if (category === dict.connections.create.categoryAll) {
      setFilteredConnectors(connectors);
    } else {
      setFilteredConnectors(
        connectors.filter((connector) => connector.category === category)
      );
    }
    setActiveCategory(category);
  };

  return (
    <div className='flex w-full flex-col px-4 pb-6'>
      {connectionData.connector && (
        <div className='flex flex-col justify-center border-b py-4 dark:border-gray-800'>
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <div className='flex w-full flex-row items-center gap-4'>
            <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-gray-50 px-4 py-2 text-left text-sm text-irmin_black shadow dark:bg-gray-800 dark:text-gray-200'>
              <Image
                src={connectionData.connector.logo}
                alt={connectionData.connector.name}
                className='h-12 w-12 object-contain'
                width={48}
                height={48}
              />
              <div className='flex flex-col justify-start gap-1'>
                <span className='w-max rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                  {connectionData.connector.category}
                </span>
                <p>{connectionData.connector.name}</p>
              </div>
            </div>
            <div className='flex max-w-64 flex-col gap-1'>
              <p className='text-sm opacity-80'>
                {connectionData.connector.description}
              </p>
              {connectionData.connector.url && (
                <Link
                  className='text-sm text-irmin_blue transition-all duration-200 hover:underline dark:text-irmin_green'
                  target='_blank'
                  rel='noopener noreferrer'
                  href={connectionData.connector.url}
                >
                  {dict.connections.create.learnMore}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      <div className='flex w-full flex-wrap gap-2 border-b py-4 dark:border-gray-800'>
        {categoryFilterOptions.map((category, index) => (
          <button
            type='button'
            className={`rounded-lg px-4 py-2 text-sm text-irmin_black shadow transition-all hover:opacity-80 dark:bg-gray-800 dark:text-gray-200 ${
              activeCategory === category
                ? 'bg-irmin_light_green text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'
                : 'bg-gray-100'
            }`}
            key={`category-${index}`}
            onClick={() => {
              selectCategoryFilter(category);
            }}
          >
            {category}
          </button>
        ))}
      </div>
      <div className='flex flex-wrap gap-2 py-4'>
        {filteredConnectors.map((connector, index) => (
          <button
            type='button'
            className={`flex w-max max-w-[50%] flex-row items-center justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left text-sm text-irmin_black shadow transition-all hover:opacity-80 dark:bg-gray-800 dark:text-gray-200 ${
              connectionData.connector?.id === connector.id
                ? 'outline outline-gray-800 dark:outline-gray-200'
                : ''
            } `}
            key={`connector-${index}`}
            onClick={() => handleConnectorClick(connector)}
          >
            <Image
              src={connector.logo}
              alt={connector.name}
              className='h-12 w-12 object-contain'
              width={48}
              height={48}
            />
            <div className='flex flex-col justify-start gap-1'>
              <span className='w-max rounded-lg bg-irmin_light_green px-1 text-xs leading-4 text-irmin_blue dark:bg-irmin_green dark:text-irmin_black'>
                {connector.category}
              </span>
              <p>{connector.name}</p>
            </div>
          </button>
        ))}
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='w-full'
          variant='solid'
          colorScheme='primary'
          size='md'
          onClick={handleContinue}
          disabled={connectionData.connector === null}
        >
          {dict.connections.create.confirmConnectorSelection}
        </Button>
      </div>
      <div className='flex items-center justify-between pt-4'>
        <Button
          variant='solid'
          colorScheme='light'
          size='sm'
          onClick={() => {
            irminAlert(
              'info',
              'This feature is not available yet. To build and use custom connectors, please contact support.'
            );
          }}
          ariaLabel='Add custom connector'
        >
          {dict.connections.create.addCustomConnector}
        </Button>
        <Button
          variant='link'
          colorScheme='gray'
          size='md'
          icon={<MdOutlineSupportAgent />}
          href='/contact'
          target='_blank'
          ariaLabel='Go to support page'
        >
          {dict.connections.create.contactSupport}
        </Button>
      </div>
    </div>
  );
}
