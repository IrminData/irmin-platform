'use client';

import Image from 'next/image';
import { useEffect, useCallback, useRef, useState } from 'react';
import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import ConnectionService from '@/lib/ConnectionService';
import { useWorkspace } from '@/context/WorkspaceContext';
import { usePopup } from '@/context/PopupContext';
import LoadingSpinner from '../misc/LoadingSpinner';
import { ConnectionDetailsAndSettings } from '@/types/Connector';

export default function DefineConnectionDetails({
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

  const fetchConnectionDetails = useCallback(async () => {
    if (
      loading ||
      !connectionData.connector ||
      !currentWorkspace ||
      connectionData.connectionDetailsFields ||
      initialLoadingDone
    )
      return;

    setLoading(true);

    try {
      const response = await connectionService.fetchNewConnectionDetails(
        currentWorkspace.slug,
        connectionData.connector.id
      );
      setConnectionData((prev: connectionDataType) => ({
        ...prev,
        connectionDetailsFields: response.data,
      }));
      setInitialLoadingDone(true);
    } catch (error: any) {
      console.error('Fetch connection details error:', error);
      irminAlert(
        'error',
        error.message ?? 'Failed to fetch connection details'
      );
    }
  }, [
    connectionService,
    currentWorkspace,
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
        setConnectionData((prev: connectionDataType) => ({
          ...prev,
          name: irminConnectionName ?? `${connectorName} ${Date.now()}`,
          connectionDetails: data,
        }));

        // Test the connection
        const res = await connectionService.testConnectionWithDetails(
          currentWorkspace.slug,
          connectionData.connector.id,
          data
        );
        if (res.data.connected) {
          // Proceed to the next step
          irminAlert('success', 'Connection successful');
          setCurrentStep(3);
        } else {
          irminAlert('error', 'Connection failed');
        }
      } catch (error: any) {
        console.error('Test connection error:', error);
        irminAlert('error', error.message ?? 'Failed to test connection');
      } finally {
        setLoading(false);
      }
    },
    [
      connectionData.connectionDetailsFields,
      connectionData.connector,
      formRef,
      currentWorkspace?.slug,
      setLoading,
      setConnectionData,
      setCurrentStep,
      connectionService,
      irminAlert,
    ]
  );

  if (connectionData.connectionDetailsFields === null) {
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
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Connection name *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='irmin_connection_name'
            placeholder='Connection name'
            required
          />
        </div>

        {Object.entries(connectionData.connectionDetailsFields).map(
          ([key, value], idx) => (
            <div
              key={`connection-details-field-${key.toLowerCase()}-${idx}`}
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
          onClick={continueAndTestConnection}
        >
          Continue & test connection
        </button>
        <button
          className='w-full text-center text-sm font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline'
          onClick={(e) => {
            e.preventDefault();
            setCurrentStep(1);
          }}
        >
          Go back
        </button>
      </form>
    </div>
  );
}
