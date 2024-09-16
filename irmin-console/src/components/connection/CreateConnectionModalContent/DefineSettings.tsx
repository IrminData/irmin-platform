'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import DynamicFormField from '@/components/common/DynamicFormField';
import LoadingSpinner from '@/components/common/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { DynamicFieldValues, FieldValue } from '@/types/internal/DynamicField';

import { ConnectionSetup } from '.';

export default function DefineSettings({
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
  const { connectionService } = useMemo(() => new IrminCore(locale), [locale]);
  const [loading, setLoading] = useState(false);

  const initialLoadingDone = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fetchConnectionSettings = useCallback(async () => {
    if (
      loading ||
      !connectionData.connector ||
      !connectionData.connectionDetails ||
      connectionData.connectionSettingsFields ||
      initialLoadingDone.current
    )
      return;

    setLoading(true);

    try {
      const response = await connectionService.fetchNewConnectionSettings(
        connectionData.connector.id,
        connectionData.connectionDetails
      );
      const data = Object.fromEntries(
        Object.keys(response.data).map((key) => [
          key,
          response.data[key].default ?? null,
        ])
      );
      setConnectionData((prev: ConnectionSetup) => ({
        ...prev,
        connectionSettingsFields: response.data,
        connectionSettings: data,
      }));
    } catch (error) {
      console.error('Fetch new connection settings error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch new connection settings'
      );
    }

    initialLoadingDone.current = true;
    setLoading(false);
  }, [
    connectionService,
    connectionData.connector,
    connectionData.connectionDetails,
    connectionData.connectionSettingsFields,
    irminAlert,
    loading,
    setConnectionData,
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
        !connectionData.connector ||
        !formRef.current
      )
        return;

      setLoading(true);

      try {
        // Get the data from the form
        const formData = new FormData(formRef.current!);
        const data: DynamicFieldValues = {};
        formData.forEach((value, key) => {
          if (key !== 'irmin_connection_name') {
            const fieldKey = Object.keys(
              connectionData.connectionSettingsFields ?? {}
            ).find((field) => field.toLowerCase() === key);
            if (!fieldKey) return;
            const field = (connectionData.connectionSettingsFields ?? {})[
              fieldKey ?? ''
            ];
            if (field.type === 'integer' || field.type === 'float') {
              data[fieldKey] = parseFloat(value as string);
            } else {
              data[fieldKey] = value as string;
            }
          }
        });

        // Update the connection data state
        setConnectionData((prev: ConnectionSetup) => ({
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
      connectionData.connector,
      formRef,
      setLoading,
      setConnectionData,
      setCurrentStep,
      irminAlert,
    ]
  );

  const updateValues = (key: string, value: FieldValue | FieldValue[]) => {
    setConnectionData({
      ...connectionData,
      connectionSettings: {
        ...connectionData.connectionSettings,
        [key]: value,
      },
    });
  };

  if (connectionData.connectionSettingsFields === null) {
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
            <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left text-sm text-irmin_black shadow dark:bg-gray-800 dark:text-gray-200'>
              <Image
                src={connectionData.connector.logo ?? '/irmin-logo.svg'}
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
                  className='text-sm text-irmin_blue dark:text-irmin_green'
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
        {Object.entries(connectionData.connectionSettingsFields).map(
          ([key, field], idx) => (
            <div key={`connection-settings-field-${key.toLowerCase()}-${idx}`}>
              <DynamicFormField
                name={key}
                field={field}
                values={connectionData.connectionSettings}
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
          onClick={continueCreateConnection}
        >
          {dict.connections.create.continue}
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
