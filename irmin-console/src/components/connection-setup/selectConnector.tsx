'use client';

import Image from 'next/image';
import { connectionDataType } from '@/components/connection-setup/connectionSetupView';
import { Connector } from '@/types/Connector';
import { usePopup } from '@/context/PopupContext';
import Link from 'next/link';

export function SelectConnector({
  connectors,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: Connector[];
  setConnectionData: React.Dispatch<React.SetStateAction<connectionDataType>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { irminAlert } = usePopup();

  const handleConnectorClick = (connector: Connector) => {
    setConnectionData((prev) => ({
      ...prev,
      connector: connector,
    }));
    setCurrentStep(2);
  };

  return (
    <div className='flex h-[70vh] flex-col justify-between'>
      <div className='grid grid-cols-3 gap-4 p-6'>
        {connectors.map((connector, index) => (
          <button
            key={index}
            className='flex flex-col items-center justify-center rounded-lg border p-4 transition duration-300 hover:shadow-lg'
            onClick={() => handleConnectorClick(connector)}
          >
            <Image
              src={connector.logo}
              alt={connector.name}
              className='mb-2 h-[40px]'
              width={40}
              height={40}
            />
            <span className='text-sm'>{connector.name}</span>
          </button>
        ))}
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto flex items-center justify-between border-t px-6 py-4'>
        <button
          onClick={() => {
            irminAlert(
              'info',
              'This feature is not available yet. To build and use custom connectors, please contact support.'
            );
          }}
          className='rounded bg-ash_gray-500 px-4 py-2 text-white transition duration-300 hover:bg-ash_gray-600'
        >
          Add custom connector
        </button>
        <Link
          className='text-ash_gray-500 hover:underline'
          href='/contact'
          target='_blank'
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
