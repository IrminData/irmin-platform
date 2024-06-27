'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import ConnectionService from '@/lib/ConnectionService';

export default function DefineSync({
  connectionData,
  setConnectionData,
  setCurrentStep,
  setIsOpen,
}: {
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const connectionService = ConnectionService.getInstance();

  const { irminAlert } = usePopup();
  const { currentWorkspace } = useWorkspace();

  const [cronValue, setCronValue] = useState(connectionData.cron);
  const [isLoading, setIsLoading] = useState(false);

  const startSync = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      // Prevent if already loading
      if (isLoading) return;
      setIsLoading(true);
      // Save the cron value to the connection data
      setConnectionData((prev: connectionDataType) => ({
        ...prev,
        cron: cronValue,
      }));
      // Validate all required fields are filled
      if (
        !currentWorkspace ||
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
        setIsLoading(false); // Ensure loading state is reset
        return;
      }
      try {
        // Start the sync
        const res = await connectionService.createConnection(
          currentWorkspace.slug,
          connectionData.connector.id,
          connectionData.name,
          connectionData.cron,
          connectionData.connectionDetails,
          connectionData.connectionSettings
        );
        // Inform that sync has started
        irminAlert(
          'success',
          res.metadata?.message ?? 'Sync has started successfully'
        );
        setIsOpen(false);
      } catch (error: any) {
        console.error('Failed to start the sync', error);
        irminAlert('error', error.message ?? 'Failed to start the sync');
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      cronValue,
      currentWorkspace,
      connectionData,
      connectionService,
      irminAlert,
      setIsOpen,
      setIsLoading,
      setConnectionData,
    ]
  );

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
      <div className='mb-6'>
        <label className='mb-2 block font-light text-rich_black' htmlFor=''>
          Sync interval (cron expression)
        </label>
        <input
          className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
          defaultValue={cronValue}
          onChange={(e) => {
            setCronValue(e.target.value);
          }}
        />
      </div>
      <button
        className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600'
        onClick={startSync}
      >
        Start sync
      </button>
      <button
        className='w-full text-center text-sm font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline'
        onClick={(e) => {
          e.preventDefault();
          setCurrentStep(3);
        }}
      >
        Go back
      </button>
    </div>
  );
}
