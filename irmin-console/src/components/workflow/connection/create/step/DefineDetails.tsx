'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import DynamicFormField from '@/components/common/DynamicFormField';
import Input from '@/components/common/form/Input';
import LoadingSpinner from '@/components/common/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import { DynamicFieldValues, FieldValue } from '@/types/internal/DynamicField';

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

  const fetchConnectionDetails = useCallback(async () => {
    if (
      loading ||
      !connectionData.connector ||
      connectionData.connectionDetailsFields ||
      initialLoadingDone.current
    )
      return;

    setLoading(true);

    try {
      const response = await connectionService.fetchNewConnectionDetails(
        connectionData.connector.id
      );
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
    } catch (error) {
      console.error('Fetch connection details error:', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch connection details'
      );
    }

    initialLoadingDone.current = true;
    setLoading(false);
  }, [
    connectionService,
    connectionData.connector,
    connectionData.connectionDetailsFields,
    irminAlert,
    loading,
    setConnectionData,
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
          irminAlert('success', dict.workflow.connection.create.success);
          setCurrentStep(3);
        } else {
          irminAlert('error', dict.workflow.connection.create.failed);
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
      <div className='flex flex-row items-center gap-4 border-b pb-4'>
        <Image
          src={connectionData?.connector?.logo ?? '/irmin-logo.svg'}
          alt={connectionData.connector?.name ?? 'Connector'}
          className='h-12 w-12 object-contain'
          width={48}
          height={48}
        />
        <span className='text-lg text-irmin_blue dark:text-irmin_light_green'>
          {connectionData.connector?.name ?? 'Connector'}
        </span>
      </div>

      <form ref={formRef}>
        <div className='my-4 border-b pb-4'>
          <label className='mb-1 block'>
            {dict.workflow.connection.create.workflowName}
            <span className='ml-2 text-red-500'>*</span>
          </label>
          <Input
            variant='outline'
            colorScheme='gray'
            className='mt-2 w-full'
            name='irmin_connection_name'
            placeholder={dict.workflow.connection.create.workflowName}
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
          {dict.workflow.connection.create.continueAndTest}
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
      </form>
    </div>
  );
}
