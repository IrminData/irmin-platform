'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import ConnectionService from '@/lib/api/ConnectionService';

import Button from '@/components/misc/Button';
import Input from '@/components/misc/Input';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { ConnectionDetailsAndSettings } from '@/types/api/Connector';
import { ConnectionSetup } from '@/types/internal/ConnectionSetup';

export default function DefineConnectionDetails({
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { locale, dict } = useLocale();
  const { irminAlert } = usePopup();
  const connectionService = ConnectionService.getInstance(locale);
  const [loading, setLoading] = useState(false);
  const [initialLoadingDone, setInitialLoadingDone] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const fetchConnectionDetails = useCallback(async () => {
    if (
      loading ||
      !connectionData.connector ||
      connectionData.connectionDetailsFields ||
      initialLoadingDone
    )
      return;

    setLoading(true);

    try {
      const response = await connectionService.fetchNewConnectionDetails(
        connectionData.connector.id
      );
      setConnectionData((prev: ConnectionSetup) => ({
        ...prev,
        connectionDetailsFields: response.data,
      }));
      setInitialLoadingDone(true);
    } catch (error) {
      console.error('Fetch connection details error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch connection details'
      );
    }
  }, [
    connectionService,
    connectionData.connector,
    irminAlert,
    loading,
    initialLoadingDone,
    setInitialLoadingDone,
    setConnectionData,
    connectionData.connectionDetailsFields,
  ]);

  useEffect(() => {
    fetchConnectionDetails();
  }, [fetchConnectionDetails]);

  const continueAndTestConnection = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      // Validate form and continue
      if (
        !connectionData.connectionDetailsFields ||
        !connectionData.connector ||
        !formRef.current
      )
        return;

      setLoading(true);

      try {
        // Get the data from the form
        const formData = new FormData(formRef.current!);
        const data: ConnectionDetailsAndSettings = {};
        let irminConnectionName: string | null = null;

        formData.forEach((value, key) => {
          if (key !== 'irmin_connection_name') {
            const fieldKey = Object.keys(
              connectionData.connectionDetailsFields ?? {}
            ).find((field) => field.toLowerCase() === key);

            if (!fieldKey) return;

            const field = (connectionData.connectionDetailsFields ?? {})[
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
          } else {
            irminConnectionName = value as string;
          }
        });

        // Update the connection data state
        const connectorName = connectionData.connector.name;
        setConnectionData((prev: ConnectionSetup) => ({
          ...prev,
          name: irminConnectionName ?? `${connectorName} ${Date.now()}`,
          connectionDetails: data,
        }));

        // Test the connection
        const res = await connectionService.testConnectionWithDetails(
          connectionData.connector.id,
          data
        );
        if (res.data.connected) {
          // Proceed to the next step
          irminAlert('success', dict.connection.create.success);
          setCurrentStep(3);
        } else {
          irminAlert('error', dict.connection.create.failed);
        }
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
      connectionData.connectionDetailsFields,
      connectionData.connector,
      formRef,
      setLoading,
      setConnectionData,
      setCurrentStep,
      connectionService,
      irminAlert,
      dict,
    ]
  );

  if (connectionData.connectionDetailsFields === null) {
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
        <div className='mb-6'>
          <label className='mb-2 block font-light text-irmin_black' htmlFor=''>
            {dict.connection.create.connectionName} *
          </label>
          <Input
            variant='outline'
            colorScheme='black'
            className='mt-2 w-full'
            name='irmin_connection_name'
            placeholder={dict.connection.create.connectionName}
            required
          />
        </div>

        {Object.entries(connectionData.connectionDetailsFields).map(
          ([key, value], idx) => (
            <div
              key={`connection-details-field-${key.toLowerCase()}-${idx}`}
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
          onClick={continueAndTestConnection}
        >
          {dict.connection.create.continueAndTest}
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
