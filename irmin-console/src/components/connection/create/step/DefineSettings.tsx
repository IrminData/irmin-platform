'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import DynamicFormField from '@/components/common/DynamicFormField';
import LoadingSpinner from '@/components/common/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import { DynamicFieldValues, FieldValue } from '@/types/internal/DynamicField';

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
      <div className='flex flex-row items-center gap-4 border-b pb-4 dark:border-gray-800'>
        <Image
          src={connectionData?.connector?.logo ?? '/irmin-logo.svg'}
          alt={connectionData.connector?.name ?? 'Connector'}
          className='mr-2 h-12 w-12 object-contain grayscale'
          width={48}
          height={48}
        />
        <span className='text-lg text-irmin_blue dark:text-white'>
          {connectionData.connector?.name ?? 'Connector'}
        </span>
      </div>

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
