'use client';

import { useCallback, useMemo, useState } from 'react';

import Image from 'next/image';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';

export default function DefineSync({
  connectionData,
  setConnectionData,
  setCurrentStep,
  setIsOpen,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { locale, dict } = useLocale();
  const { connectionService } = useMemo(() => new IrminCore(locale), [locale]);

  const { irminAlert } = usePopup();

  const [cronValue, setCronValue] = useState(connectionData.cron);
  const [processing, setProcessing] = useState(false);

  const startWorkflow = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      // Prevent if already loading
      if (processing) return;
      setProcessing(true);
      // Save the cron value to the connection data
      setConnectionData((prev: ConnectionSetup) => ({
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
        setProcessing(false); // Ensure loading state is reset
        return;
      }
      try {
        // Start the sync
        const res = await connectionService.createConnection({
          connectorID: connectionData.connector.id,
          connectionDetails: connectionData.connectionDetails,
          connectionSettings: connectionData.connectionSettings,
          name: connectionData.name,
          description: connectionData.description,
          cron_syntax: connectionData.cron,
        });
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
        setProcessing(false);
      }
    },
    [
      processing,
      cronValue,
      connectionData,
      connectionService,
      irminAlert,
      setIsOpen,
      setProcessing,
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
          {dict.workflow.connection.create.syncIntervalLabel}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          placeholder={dict.workflow.connection.create.syncIntervalPlaceholder}
          defaultValue={cronValue}
          onChange={(e) => {
            setCronValue(e.target.value);
          }}
        />
      </div>
      <div className='mb-6'>
        <label className='mb-2 block font-light text-irmin_black' htmlFor=''>
          {dict.workflow.connection.create.workflowDescription}
        </label>
        <Input
          variant='outline'
          colorScheme='black'
          className='mt-2 w-full'
          defaultValue={connectionData.description}
          onChange={(e) => {
            setConnectionData((prev: ConnectionSetup) => ({
              ...prev,
              description: e.target.value ?? '',
            }));
          }}
        />
      </div>
      <Button
        className='mb-6 inline-block w-full'
        variant='solid'
        colorScheme='primary'
        size='md'
        onClick={startWorkflow}
      >
        {dict.workflow.connection.create.startWorkflow}
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
        {dict.workflow.connection.create.goBack}
      </Button>
    </div>
  );
}
