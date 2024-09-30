'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import DynamicFormField from '@/components/common/DynamicFormField';
import Input from '@/components/common/form/Input';
import LoadingSpinner from '@/components/common/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { DynamicFieldValues, FieldValue } from '@/types/internal/DynamicField';

import { ConnectionSetup } from '.';

export default function DefineDetails({
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
  const [loading, setLoading] = useState(false);
  const { connectionService } = useMemo(() => new IrminCore(locale), [locale]);

  const initialLoadingDone = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fetchConnectionDetails = useCallback(
    async (connectorID: number) => {
      if (loading || initialLoadingDone.current) return;
      setLoading(true);
      try {
        const response =
          await connectionService.fetchNewConnectionDetails(connectorID);
        const data = Object.fromEntries(
          Object.keys(response.data).map((key) => [
            key,
            response.data[key].default ?? null,
          ])
        );
        setConnectionData((prev: ConnectionSetup) => ({
          ...prev,
          connectionDetailsFields: response.data,
          connectionDetails: data,
        }));
        initialLoadingDone.current = true;
      } catch (error) {
        console.error('Fetch connection details error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch connection details'
        );
      }
      setLoading(false);
    },
    [
      loading,
      initialLoadingDone,
      connectionService,
      setConnectionData,
      irminAlert,
    ]
  );

  useEffect(() => {
    const connectorID = connectionData.connector?.id;
    if (!connectorID) return;
    fetchConnectionDetails(connectorID);
  }, [connectionData, fetchConnectionDetails]);

  const continueAndTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const connectorName = connectionData.connector?.name;
    const connectorID = connectionData.connector?.id;
    if (!connectorID || !connectorName) return;
    setLoading(true);
    try {
      // Get the data from the form
      const formData = new FormData(formRef.current!);
      const data: DynamicFieldValues = {};
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

          if (field.type === 'integer' || field.type === 'float') {
            data[fieldKey] = parseFloat(value as string);
          } else {
            data[fieldKey] = value as string;
          }
        } else {
          irminConnectionName = value as string;
        }
      });

      // Update the connection data state
      setConnectionData((prev: ConnectionSetup) => ({
        ...prev,
        name: irminConnectionName ?? `${connectorName} ${Date.now()}`,
        connectionDetails: data,
      }));

      // Test the connection
      const res = await connectionService.testConnectionWithDetails(
        connectorID,
        data
      );
      if (res.data.connected) {
        // Proceed to the next step
        irminAlert('success', dict.connections.create.success);
        setCurrentStep(3);
      } else {
        irminAlert('error', dict.connections.create.failed);
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
  };

  const updateValues = (key: string, value: FieldValue | FieldValue[]) => {
    setConnectionData({
      ...connectionData,
      connectionDetails: {
        ...connectionData.connectionDetails,
        [key]: value,
      },
    });
  };

  if (connectionData.connectionDetailsFields === null) {
    return <LoadingSpinner />;
  }

  return (
    <div className='p-4 pb-6'>
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
      <form ref={formRef}>
        <div className='my-4 border-b pb-4 dark:border-gray-800'>
          <label className='mb-1 block dark:text-gray-400'>
            {dict.connections.create.connectionName}
            <span className='ml-2 text-red-500'>*</span>
          </label>
          <Input
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            name='irmin_connection_name'
            placeholder={dict.connections.create.connectionNamePlaceholder}
            required
          />
        </div>

        {Object.entries(connectionData.connectionDetailsFields).map(
          ([key, field], idx) => (
            <div key={`connection-details-field-${key.toLowerCase()}-${idx}`}>
              <DynamicFormField
                name={key}
                field={field}
                values={connectionData.connectionDetails}
                updateValues={updateValues}
              />
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
          {dict.connections.create.continueAndTest}
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
          {dict.connections.create.goBack}
        </Button>
      </form>
    </div>
  );
}
