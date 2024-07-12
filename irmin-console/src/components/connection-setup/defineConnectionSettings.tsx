'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import ConnectionService from '@/lib/api/ConnectionService';

import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { ConnectionDetailsAndSettings } from '@/types/Connector';

export default function DefineConnectionSettings({
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { locale, dict } = useLocale();
  const { currentWorkspace } = useWorkspace();
  const { irminAlert } = usePopup();
  const connectionService = ConnectionService.getInstance(locale);

  const [loading, setLoading] = useState(false);
  const [initialLoadingDone, setInitialLoadingDone] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const fetchConnectionSettings = useCallback(async () => {
    if (
      loading ||
      !currentWorkspace ||
      !connectionData.connector ||
      !connectionData.connectionDetails ||
      connectionData.connectionSettingsFields ||
      initialLoadingDone
    )
      return;

    setLoading(true);

    try {
      const response = await connectionService.fetchNewConnectionSettings(
        currentWorkspace.slug,
        connectionData.connector.id,
        connectionData.connectionDetails
      );
      if (
        Object.prototype.hasOwnProperty.call(response.data, 'settings') &&
        !response.data.settings
      ) {
        // Settings are not required
        setConnectionData((prev: connectionDataType) => ({
          ...prev,
          connectionSettingsFields: {
            settings: 'text',
          },
          connectionSettings: {
            settings: '',
          },
        }));
        setInitialLoadingDone(true);
        setCurrentStep(4);
      } else {
        // Settings are required
        setConnectionData((prev: connectionDataType) => ({
          ...prev,
          connectionSettingsFields: response.data,
        }));
        setInitialLoadingDone(true);
      }
    } catch (error) {
      console.error('Fetch new connection settings error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch new connection settings'
      );
    }
  }, [
    connectionService,
    currentWorkspace,
    connectionData.connector,
    connectionData.connectionDetails,
    irminAlert,
    loading,
    initialLoadingDone,
    setInitialLoadingDone,
    connectionData.connectionSettingsFields,
    setConnectionData,
    setCurrentStep,
  ]);

  useEffect(() => {
    fetchConnectionSettings();
  }, [fetchConnectionSettings]);

  const continueCreateConnection = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      // Validate form and continue
      if (
        !connectionData.connectionSettingsFields ||
        !currentWorkspace?.slug ||
        !connectionData.connector ||
        !formRef.current
      )
        return;

      setLoading(true);

      try {
        // Get the data from the form
        const formData = new FormData(formRef.current!);
        const data: ConnectionDetailsAndSettings = {};
        formData.forEach((value, key) => {
          if (key !== 'irmin_connection_name') {
            const fieldKey = Object.keys(
              connectionData.connectionSettingsFields ?? {}
            ).find((field) => field.toLowerCase() === key);
            if (!fieldKey) return;
            const field = (connectionData.connectionSettingsFields ?? {})[
              fieldKey ?? ''
            ];
            if (
              field === 'number' ||
              field === 'integer' ||
              field === 'float'
            ) {
              data[fieldKey] = parseFloat(value as string);
            } else {
              data[fieldKey] = value as string;
            }
          }
        });

        // Update the connection data state
        setConnectionData((prev: connectionDataType) => ({
          ...prev,
          connectionSettings: data,
        }));

        // Proceed to the next step
        setCurrentStep(4);
      } catch (error) {
        console.error('Test connection error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to test connection'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      connectionData.connectionSettingsFields,
      currentWorkspace?.slug,
      connectionData.connector,
      formRef,
      setLoading,
      setConnectionData,
      setCurrentStep,
      irminAlert,
    ]
  );

  if (connectionData.connectionSettingsFields === null) {
    return <LoadingSpinner />;
  }

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

      <form ref={formRef}>
        {Object.entries(connectionData.connectionSettingsFields).map(
          ([key, value], idx) => (
            <div
              key={`connection-settings-field-${key.toLowerCase()}-${idx}`}
              className='mb-6'
            >
              <label className='mb-2 block font-light text-irmin_black'>
                {key} *
              </label>
              {value === 'password' ? (
                <Input
                  variant='outline'
                  colorScheme='black'
                  className='mt-2 w-full'
                  type='password'
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              ) : value === 'number' || value === 'integer' ? (
                <Input
                  variant='outline'
                  colorScheme='black'
                  className='mt-2 w-full'
                  type={'number'}
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              ) : value === 'float' ? (
                <Input
                  variant='outline'
                  colorScheme='black'
                  className='mt-2 w-full'
                  type={'number'}
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              ) : (
                <Input
                  variant='outline'
                  colorScheme='black'
                  className='mt-2 w-full'
                  type={value}
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              )}
            </div>
          )
        )}

        <Button
          className='mb-6 inline-block w-full'
          variant='solid'
          colorScheme='primary'
          size='md'
          onClick={continueCreateConnection}
        >
          {dict.connection.create.continue}
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
      </form>
    </div>
  );
}
