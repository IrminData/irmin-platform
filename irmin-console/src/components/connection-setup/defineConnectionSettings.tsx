'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import { Connector } from '@/types/Connector';

export default function DefineConnectionSettings({
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
  // TODO: Fetch the fields from /settings
  // TODO: If no settings are required, skip this step

  const formRef = useRef<HTMLFormElement>(null);

  const connector = connectors.find(
    (connector) => connector.id === connectionData.connectorID
  );
  if (!connector) {
    setCurrentStep(1);
    return <></>;
  }

  const continueSetup = (e: React.MouseEvent) => {
    e.preventDefault();
    const formData = new FormData(formRef.current!);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    setConnectionData((prev: connectionDataType) => ({
      ...prev,
      connectionSettings: data,
    }));
    // TODO: Create the connection using the API
    setCurrentStep(4);
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
            Account *
          </label>
          <input
            className='block w-full appearance-none rounded-full border border-rich_black p-3 leading-5 text-rich_black placeholder-gray-200 shadow-md focus:outline-none'
            type='account'
            placeholder='Account'
            required
          />
        </div>
        <button
          className='mb-6 inline-block w-full rounded-full bg-ash_gray-500 px-7 py-3 text-center text-base font-medium leading-6 text-white shadow-sm hover:bg-ash_gray-600'
          onClick={continueSetup}
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
