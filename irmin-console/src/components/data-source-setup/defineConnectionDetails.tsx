'use client';

import { useRef } from 'react';
import { connectionDataType } from '../dataSourceSetupView';

export default function DefineConnectionDetails({
  connectors,
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: { name: string; icon: any; id: number }[];
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  // TODO: Fetch the fields from /details

  const formRef = useRef<HTMLFormElement>(null);

  const connector = connectors.find(
    (connector) => connector.id === connectionData.connector
  );
  if (!connector) {
    setCurrentStep(1);
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
        <connector.icon className='mr-4 text-4xl text-air_force_blue' />
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
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
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
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
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
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
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
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
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
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
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
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
            type='password'
            placeholder='Password'
            required
          />
        </div>
        <button
          className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50'
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
