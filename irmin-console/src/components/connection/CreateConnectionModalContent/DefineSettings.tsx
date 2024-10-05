'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import IrminCore from '@/services/core/IrminCore';

import Button from '@/components/common/button/Button';
import DynamicForm from '@/components/common/form/DynamicForm';
import LoadingSpinner from '@/components/common/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { DynamicFieldValues } from '@/types/internal/DynamicField';

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

  const fetchedFields = useRef(false);

  // Function to fetch connection settings from backend
  const fetchConnectionSettings = useCallback(
    async (connectorID: string, connectionDetails: DynamicFieldValues) => {
      setLoading(true);
      fetchedFields.current = true;
      try {
        const res = await connectionService.fetchNewConnectionSettings(
          connectorID,
          connectionDetails
        );

        // Update connection data state
        setConnectionData((prev: ConnectionSetup) => ({
          ...prev,
          connectionSettingsFields: res.data,
        }));
      } catch (error) {
        console.error('Fetch new connection settings error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to fetch new connection settings'
        );
      }
      setLoading(false);
    },
    [connectionService, setConnectionData, irminAlert]
  );

  // Fetch settings when component is mounted or connectionData changes
  useEffect(() => {
    const connectorID = connectionData.connector?.id;
    const connectionDetails = connectionData.connectionDetails;
    if (!connectorID || !connectionDetails) return;
    if (!fetchedFields.current)
      fetchConnectionSettings(connectorID, connectionDetails);
  }, [connectionData, fetchConnectionSettings]);

  // Handle form submission to continue creating connection
  const continueCreateConnection = useCallback(
    async (data: DynamicFieldValues) => {
      setLoading(true);
      try {
        // Update connection data state with form values
        setConnectionData({
          ...connectionData,
          connectionSettings: data,
        });
        // Proceed to the next step
        setCurrentStep(4);
      } catch (error) {
        console.error('Failed to set connection settings:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to set connection settings'
        );
      } finally {
        setLoading(false);
      }
    },
    [connectionData, setConnectionData, setCurrentStep, irminAlert]
  );

  if (loading || !connectionData.connectionSettingsFields) {
    return <LoadingSpinner />;
  }

  return (
    <div className='p-4 pb-6'>
      {/* Display Connector Information */}
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

      {/* Dynamic Form Render */}
      <DynamicForm
        fields={connectionData.connectionSettingsFields}
        onSubmit={continueCreateConnection}
        submitButtonText={dict.connections.create.continue}
      />

      {/* Go Back Button */}
      <Button
        className='mb-6 inline-block w-full'
        variant='link'
        colorScheme='primary'
        size='sm'
        onClick={() => setCurrentStep((currentStep) => currentStep - 1)}
      >
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
