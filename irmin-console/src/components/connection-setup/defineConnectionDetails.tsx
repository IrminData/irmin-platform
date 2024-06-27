'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import ConnectionService from '@/lib/ConnectionService';
import { Connector } from '@/types/Connector';
import { useWorkspace } from '@/context/WorkspaceContext';
import { usePopup } from '@/context/PopupContext';

export default function DefineConnectionDetails({
  connectors,
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: Connector[];
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { currentWorkspace } = useWorkspace();
  const { irminAlert } = usePopup();
  const connectionService = ConnectionService.getInstance();

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      if (!connectionData.connectorID || !currentWorkspace) {
        return;
      }
      connectionService
        .fetchNewConnectionDetails(
          currentWorkspace.slug,
          connectionData.connectorID
        )
        .then((response) => {
          console.log('Connection details:', response);
        });
    } catch (error: any) {
      console.error('Fetch connectors error:', error);
      irminAlert('error', 'Failed to fetch connector details');
    }
  }, [
    connectionService,
    currentWorkspace,
    connectionData.connectorID,
    irminAlert,
  ]);

  const connector = connectors.find(
    (connector) => connector.id === connectionData.connectorID
  );
  if (!connector) {
    return <></>;
  }

  const continueAndTestConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    const formData = new FormData(formRef.current!);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    setConnectionData((prev: connectionDataType) => ({
      ...prev,
      connectionDetails: data,
    }));
    setCurrentStep(3);
  };

  return (
    <div className='p-6'>
      <div className='mb-8 flex'>
        <Image
          src={connector.logo}
          alt={connector.name}
          className='mb-2 h-[40px]'
          width={40}
          height={40}
        />
        <span className='mt-1 text-xl text-air_force_blue'>
          {connector.name}
        </span>
      </div>

      <form action='' ref={formRef}>
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Connection name *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='name'
            placeholder='Connection name'
            required
          />
        </div>
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Host *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='host'
            placeholder='Host'
            required
          />
        </div>
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Port *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='port'
            placeholder='Port'
            required
          />
        </div>
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Database *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='database'
            placeholder='Database'
            required
          />
        </div>
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Username *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='username'
            placeholder='Username'
            required
          />
        </div>
        <div className='mb-6'>
          <label className='mb-2 block font-light text-rich_black' htmlFor=''>
            Password *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='password'
            placeholder='Password'
            required
          />
        </div>
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
