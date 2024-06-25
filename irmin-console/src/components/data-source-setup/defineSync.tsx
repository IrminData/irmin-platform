'use client';

import { useState } from 'react';
import Cron from 'react-cron-generator';
import { connectionDataType } from '@/components/data-source-setup/dataSourceSetupView';
import '@/app/cron-builder.css';

export default function DefineSync({
  connectors,
  connectionData,
  setConnectionData,
  setCurrentStep,
  setIsOpen,
}: {
  connectors: { name: string; icon: any; id: number }[];
  connectionData: connectionDataType;
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [cronValue, setCronValue] = useState(connectionData.cron);

  const connector = connectors.find(
    (connector) => connector.id === connectionData.connector
  );
  if (!connector) {
    setCurrentStep(1);
    return <></>;
  }

  const continueSetup = (e: React.MouseEvent) => {
    e.preventDefault();
    setConnectionData((prev: connectionDataType) => ({
      ...prev,
      cron: cronValue,
    }));
    setIsOpen(false);
  };

  return (
    <div className='p-6'>
      <div className='mb-8 flex'>
        <connector.icon className='mr-4 text-4xl text-air_force_blue' />
        <span className='mt-1 text-xl text-air_force_blue'>
          {connector.name}
        </span>
      </div>
      <div className='mb-6'>
        <label className='mb-2 block font-light text-rich_black' htmlFor=''>
          Sync interval (cron expression)
        </label>
        <input
          className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
          value={cronValue}
        />
      </div>
      <div className='py-4'>
        <Cron
          value={cronValue}
          onChange={setCronValue}
          showResultText={true}
          showResultCron={false}
        />
      </div>
      <button
        className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600'
        onClick={continueSetup}
      >
        Start sync
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
    </div>
  );
}
