'use client';

import { useCallback, useState } from 'react';

import Image from 'next/image';

import ConnectionService from '@/lib/api/ConnectionService';

import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

export default function DefineSync({
  connectionData,
  setConnectionData,
  setCurrentStep,
  setIsOpen,
}: {
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { locale, dict } = useLocale();
  const connectionService = ConnectionService.getInstance(locale);

  const { irminAlert } = usePopup();

  const [cronValue, setCronValue] = useState(connectionData.cron);
  const [isLoading, setIsLoading] = useState(false);

  const startSync = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      // Prevent if already loading
      if (isLoading) return;
      setIsLoading(true);
      // Save the cron value to the connection data
      setConnectionData((prev: connectionDataType) => ({
        ...prev,
        cron: cronValue,
      }));
      // Validate all required fields are filled
      if (
        !connectionData.name ||
        !connectionData.cron ||
        !connectionData.connector ||
        !connectionData.connectionDetails ||
        !connectionData.connectionSettings
      ) {
        irminAlert(
          'error',
          'Fields required for creating a connection are missing'
        );
        setIsLoading(false); // Ensure loading state is reset
        return;
      }
      try {
        // Start the sync
        const res = await connectionService.createConnection(
          connectionData.connector.id,
          connectionData.name,
          connectionData.cron,
          connectionData.connectionDetails,
          connectionData.connectionSettings
        );
        // Inform that sync has started
        irminAlert(
          'success',
          res.metadata?.message ?? 'Sync has started successfully'
        );
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to start the sync', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to start the sync'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      cronValue,
      connectionData,
      connectionService,
      irminAlert,
      setIsOpen,
      setIsLoading,
      setConnectionData,
    ]
  );

  return (
    <div className='p-6'>
      <div className='mb-8 flex'>
        <Image
          src={connectionData?.connector?.logo ?? '/irmin-logo.svg'}
          alt={connectionData.connector?.name ?? 'Connector'}
          className='mb-2 h-[40px]'
          width={40}
          height={40}
        />
        <span className='mt-1 text-xl text-irmin_teal'>
          {connectionData.connector?.name ?? 'Connector'}
        </span>
      </div>
      <div className='mb-6'>
        <label className='mb-2 block font-light text-irmin_black' htmlFor=''>
          {dict.connection.create.syncIntervalLabel}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder={dict.connection.create.syncIntervalPlaceholder}
          defaultValue={cronValue}
          onChange={(e) => {
            setCronValue(e.target.value);
          }}
        />
      </div>
      <Button
        className='mb-6 inline-block w-full'
        variant='solid'
        colorScheme='primary'
        size='md'
        onClick={startSync}
      >
        {dict.connection.create.startSync}
      </Button>
      <Button
        className='mb-6 inline-block w-full'
        variant='link'
        colorScheme='primary'
        size='sm'
        onClick={(e) => {
          e.preventDefault();
          setCurrentStep((currentStep) => currentStep - 1);
        }}
      >
        {dict.connection.create.goBack}
      </Button>
    </div>
  );
}
