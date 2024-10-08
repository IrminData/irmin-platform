'use client';

import { useCallback, useState } from 'react';

import Image from 'next/image';

import { Controller, useForm } from 'react-hook-form';

import { TbHelp } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connector } from '@/types/core/Connector';

import { ConnectionSetup } from '.';

// Define the form data type for react-hook-form
interface SelectConnectorFormValues {
  connector: Connector | null;
}

/**
 * Component to select a connector for the connection setup.
 *
 * @param props - Component props
 * @param props.connectors - List of available connectors
 * @param props.connectionData - Current state of the connection setup
 * @param props.setConnectionData - Setter for the connection state
 * @param props.setCurrentStep - Setter for the current step of the connection setup
 */
export default function SelectConnector({
  connectors,
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

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<SelectConnectorFormValues>({
    defaultValues: {
      connector: null,
    },
  });

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

  // Handle category selection and filtering
  const selectCategoryFilter = (category: string) => {
    setActiveCategory(category);
    setFilteredConnectors(
      category === dict.connections.create.categoryAll
        ? connectors
        : connectors.filter((connector) => connector.category === category)
    );
  };

  // Handle connector selection by setting the form value
  const handleConnectorClick = useCallback(
    (connector: Connector) => {
      setValue('connector', connector, { shouldDirty: true });
    },
    [setValue]
  );

  // Handle form submission and continue to the next step
  const handleContinue = useCallback(
    (data: SelectConnectorFormValues) => {
      if (!data.connector) {
        irminAlert('error', dict.connections.create.pleaseSelectConnector);
        return;
      }
      setConnectionData((prev) => ({
        ...prev,
        connector: data.connector ?? undefined,
      }));
      setCurrentStep(2);
    },
    [
      dict.connections.create.pleaseSelectConnector,
      irminAlert,
      setConnectionData,
      setCurrentStep,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit(handleContinue)}
      className='flex w-full flex-col px-4 pb-6'
    >
      <Controller
        name='connector'
        control={control}
        render={({ field }) => (
          <>
            {field.value && (
              <div className='flex flex-col justify-center border-b py-4 dark:border-gray-800'>
                <p className='mb-2 text-sm opacity-80'>
                  {dict.connections.create.selectedConnector}:
                </p>
                <div className='flex w-full flex-row items-center gap-4'>
                  <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-card px-4 py-2 text-left text-sm text-card-foreground shadow'>
                    <Image
                      src={field.value.logo}
                      alt={field.value.name}
                      className='h-12 w-12 object-contain'
                      width={48}
                      height={48}
                    />
                    <div className='flex flex-col justify-start gap-1'>
                      <Badge variant='secondary'>{field.value.category}</Badge>
                      <p>{field.value.name}</p>
                    </div>
                  </div>
                  <div className='flex max-w-64 flex-col gap-1'>
                    <p className='text-sm opacity-80'>
                      {field.value.description}
                    </p>
                    {field.value.url && (
                      <Button
                        variant='link'
                        target='_blank'
                        className='h-max p-0'
                        rel='noopener noreferrer'
                        href={field.value.url}
                      >
                        {dict.connections.create.learnMore}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Category Filter */}
            <div className='flex w-full flex-wrap gap-2 border-b py-4 dark:border-gray-800'>
              {categoryFilterOptions.map((category, index) => (
                <Button
                  variant={category === activeCategory ? 'accent' : 'secondary'}
                  key={`category-${index}`}
                  onClick={() => selectCategoryFilter(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            {/* Connector Selection */}
            <div className='flex flex-wrap gap-2 py-4'>
              {filteredConnectors.map((connector, index) => (
                <button
                  type='button'
                  className={`flex w-max max-w-[50%] flex-row items-center justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left text-sm text-foreground shadow transition-all hover:opacity-80 dark:bg-gray-800 dark:text-gray-200 ${
                    field.value?.id === connector.id
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
                    <Badge variant='secondary'>{connector.category}</Badge>
                    <p>{connector.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      />

      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
        <Button
          className='w-full'
          size='lg'
          variant='default'
          type='submit'
          disabled={!isDirty}
        >
          {dict.connections.create.confirmConnectorSelection}
        </Button>
      </div>
      <div className='flex items-center justify-between pt-4'>
        <Button
          variant='secondary'
          size='sm'
          onClick={() => {
            irminAlert(
              'info',
              'This feature is not available yet. To build and use custom connectors, please contact support.'
            );
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
    </form>
  );
}
