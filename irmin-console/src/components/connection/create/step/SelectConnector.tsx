'use client';

import Image from 'next/image';

import { MdOutlineSupportAgent } from 'react-icons/md';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connector } from '@/types/api/Connector';
import { ConnectionSetup } from '@/types/internal/ConnectionSetup';

export default function SelectConnector({
  connectors,
  setConnectionData,
  setCurrentStep,
}: {
  connectors: Connector[];
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();
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
            type='button'
            className='flex w-full flex-col items-center justify-center gap-1 rounded-lg bg-gray-100 py-2 text-irmin_black shadow transition-all hover:opacity-80 dark:bg-gray-800 dark:text-gray-200'
            key={`connector-choice-${index}`}
            onClick={() => handleConnectorClick(connector)}
          >
            <Image
              src={connector.logo}
              alt={connector.name}
              className='h-12 w-12 object-contain'
              width={48}
              height={48}
            />
            {connector.name}
          </button>
        ))}
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto flex items-center justify-between border-t px-6 py-4 dark:border-gray-800'>
        <Button
          variant='solid'
          colorScheme='light'
          size='sm'
          onClick={() => {
            irminAlert(
              'info',
              'This feature is not available yet. To build and use custom connectors, please contact support.'
            );
          }}
          ariaLabel='Add custom connector'
        >
          {dict.connections.create.addCustomConnector}
        </Button>
        <Button
          variant='link'
          colorScheme='gray'
          size='md'
          icon={<MdOutlineSupportAgent />}
          href='/contact'
          target='_blank'
          ariaLabel='Go to support page'
        >
          {dict.connections.create.contactSupport}
        </Button>
      </div>
    </div>
  );
}
