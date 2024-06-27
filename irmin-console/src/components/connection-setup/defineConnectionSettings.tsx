'use client';

import Image from 'next/image';
import { useEffect, useCallback, useRef, useState } from 'react';
import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import ConnectionService from '@/lib/ConnectionService';
import { useWorkspace } from '@/context/WorkspaceContext';
import { usePopup } from '@/context/PopupContext';
import LoadingSpinner from '../misc/LoadingSpinner';
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
  const { currentWorkspace } = useWorkspace();
  const { irminAlert } = usePopup();
  const connectionService = ConnectionService.getInstance();

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
      if (response.data.hasOwnProperty('settings') && !response.data.settings) {
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
    } catch (error: any) {
      console.error('Fetch new connection settings error:', error);
      irminAlert(
        'error',
        error.message ?? 'Failed to fetch new connection settings'
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
      } catch (error: any) {
        console.error('Test connection error:', error);
        irminAlert('error', error.message ?? 'Failed to test connection');
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
          src={connectionData?.connector?.logo ?? '/public/irmin-logo.svg'}
          alt={connectionData.connector?.name ?? 'Connector'}
          className='mb-2 h-[40px]'
          width={40}
          height={40}
        />
        <span className='mt-1 text-xl text-air_force_blue'>
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
              <label className='mb-2 block font-light text-rich_black'>
                {key} *
              </label>
              {value === 'password' ? (
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type='password'
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              ) : value === 'number' || value === 'integer' ? (
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type={'number'}
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              ) : value === 'float' ? (
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type={'number'}
                  step='0.001'
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              ) : (
                <input
                  className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
                  type={value}
                  placeholder={key}
                  name={key.toLowerCase()}
                  required
                />
              )}
            </div>
          )
        )}

        <button
          className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600'
          onClick={continueCreateConnection}
        >
          Continue
        </button>
        <button
          className='w-full text-center text-sm font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline'
          onClick={(e) => {
            e.preventDefault();
            setCurrentStep(2);
          }}
        >
          Go back
        </button>
      </form>
    </div>
  );
}
