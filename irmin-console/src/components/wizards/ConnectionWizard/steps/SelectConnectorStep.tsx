'use client';

import { useCallback, useState } from 'react';

import { TbHelp } from 'react-icons/tb';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConnectionCreationSkeleton } from '@/components/ui/loading/ConnectionCreationSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectors } from '@/hooks/api';

import type { Connector, ConnectorCategory } from '@/types/core/Connector';

import type { ConnectionWizardData } from '../types';

/**
 * Step component for selecting a connector
 */
export default function SelectConnectorStep({
  updateWizardData,
  goNext,
  onCancel,
}: {
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goNext: () => void;
  onCancel?: () => void;
}) {
  const { connectorsQuery } = useConnectors();

  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const [activeCategory, setActiveCategory] = useState<string>(dict.common.all);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null
  );

  // Compute category filter options from connectors
  const connectorData = connectorsQuery.data?.data ?? [];
  const filterOptions = connectorData
    .map((connector) => [...connector.categories, connector.primary_category])
    .flat();
  const categoryFilterOptions = [
    dict.common.all,
    ...Array.from(new Set(filterOptions)),
  ];

  // Compute filtered connectors based on active category
  const filteredConnectors =
    activeCategory === dict.common.all
      ? connectorData
      : connectorData.filter(
          (connector) =>
            connector.primary_category === activeCategory ||
            connector.categories.includes(activeCategory as ConnectorCategory)
        );

  const handleContinue = useCallback(() => {
    if (!selectedConnector) {
      irminAlert('error', dict.wizard.pleaseSelectConnector);
      return;
    }
    updateWizardData({
      connector: selectedConnector,
    });
    goNext();
  }, [selectedConnector, irminAlert, goNext, updateWizardData, dict]);

  if (connectorsQuery.isLoading) {
    return <ConnectionCreationSkeleton variant='connectors' />;
  }

  return (
    <div className='flex w-full flex-col space-y-6'>
      {selectedConnector && (
        <div
          className={`
            flex flex-col justify-center border-b pb-4
            dark:border-gray-800
          `}
        >
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <ConnectorInfoSmall connector={selectedConnector} />
        </div>
      )}
      {/* Category Filter */}
      <div
        className={`
          flex w-full flex-wrap gap-2 border-b pb-4
          dark:border-gray-800
        `}
      >
        {categoryFilterOptions.map((category) => (
          <Button
            variant={category === activeCategory ? 'accent' : 'secondary'}
            key={`category-${category}`}
            onClick={() => setActiveCategory(category ?? '')}
            className='capitalize'
          >
            {category}
          </Button>
        ))}
      </div>
      {/* Connector Selection */}
      <div className='flex flex-wrap gap-2'>
        {filteredConnectors.map((connector) => (
          <button
            type='button'
            className={`
              flex w-max max-w-[50%] cursor-pointer flex-row items-center
              justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left
              text-sm text-foreground shadow-sm transition-opacity
              hover:opacity-80
              dark:bg-gray-800 dark:text-gray-200
              ${
                selectedConnector?.id === connector.id &&
                `
                  outline outline-gray-800
                  dark:outline-gray-200
                `
              }
            `}
            key={`connector-${connector.id}`}
            onClick={() => {
              setSelectedConnector(connector);
            }}
          >
            <Avatar className='size-12 rounded-none'>
              <AvatarImage src={connector.logo_url} alt={connector.name} />
              <AvatarFallback>
                {connector.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-col justify-start gap-1'>
              {connector.primary_category && (
                <Badge variant='secondary'>{connector.primary_category}</Badge>
              )}
              <p>{connector.name}</p>
            </div>
          </button>
        ))}
      </div>
      <div
        className={`
          border-t pt-4
          dark:border-gray-800
        `}
      >
        {onCancel && (
          <Button
            className='mb-3 w-full'
            size='lg'
            variant='secondary'
            type='button'
            onClick={onCancel}
          >
            {dict.common.cancel}
          </Button>
        )}
        <Button
          className='w-full'
          size='lg'
          variant='default'
          type='button'
          disabled={!selectedConnector}
          onClick={handleContinue}
        >
          {dict.connections.create.confirmConnectorSelection}
        </Button>
      </div>
      <div className='flex items-center justify-between'>
        <Button
          variant='secondary'
          size='sm'
          onClick={() => {
            irminAlert('info', dict.connectors.customConnectorNotAvailable);
          }}
          aria-label='Add custom connector'
        >
          {dict.connections.create.addCustomConnector}
        </Button>
        <Button
          variant='ghost'
          icon={<TbHelp size={18} />}
          href='/contact'
          target='_blank'
          aria-label='Go to support page'
        >
          {dict.connections.create.contactSupport}
        </Button>
      </div>
    </div>
  );
}
