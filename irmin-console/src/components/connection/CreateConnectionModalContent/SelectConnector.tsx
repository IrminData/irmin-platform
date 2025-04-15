'use client';

import { Controller, useForm } from 'react-hook-form';

import { TbHelp } from 'react-icons/tb';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';

import { useCreateConnection } from '@/context/CreateConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { SelectConnectorFormValues } from '@/types/internal/ConnectionSetup';

/**
 * Component to select a connector for the connection setup.
 */
export default function SelectConnector() {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const connectionCreation = useCreateConnection();

  const { control, handleSubmit, setValue, watch } =
    useForm<SelectConnectorFormValues>({
      defaultValues: {
        connector: null,
      },
    });

  const formValues = watch();

  return (
    <form
      onSubmit={handleSubmit(connectionCreation.handleConnectorSelected)}
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
                <ConnectorInfoSmall connector={field.value} />
              </div>
            )}
            {/* Category Filter */}
            <div className='flex w-full flex-wrap gap-2 border-b py-4 dark:border-gray-800'>
              {connectionCreation.categoryFilterOptions.map(
                (category, index) => (
                  <Button
                    variant={
                      category === connectionCreation.activeCategory
                        ? 'accent'
                        : 'secondary'
                    }
                    key={`category-${index}`}
                    onClick={() =>
                      connectionCreation.selectCategoryFilter(category ?? '')
                    }
                    className='capitalize'
                  >
                    {category}
                  </Button>
                )
              )}
            </div>
            {/* Connector Selection */}
            <div className='flex flex-wrap gap-2 py-4'>
              {connectionCreation.filteredConnectors.map((connector, index) => (
                <button
                  type='button'
                  className={`text-foreground flex w-max max-w-[50%] cursor-pointer flex-row items-center justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left text-sm shadow transition-all hover:opacity-80 dark:bg-gray-800 dark:text-gray-200 ${
                    field.value?.id === connector.id
                      ? 'outline outline-gray-800 dark:outline-gray-200'
                      : ''
                  } `}
                  key={`connector-${index}`}
                  onClick={() => {
                    setValue('connector', connector);
                    connectionCreation.handleConnectorClick(connector);
                  }}
                >
                  <Avatar className='h-12 w-12 rounded-none'>
                    <AvatarImage
                      src={connector.logo_url}
                      alt={connector.name}
                    />
                    <AvatarFallback>
                      {connector.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex flex-col justify-start gap-1'>
                    {connector.primary_category && (
                      <Badge variant='secondary'>
                        {connector.primary_category}
                      </Badge>
                    )}
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
          disabled={!formValues.connector}
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
