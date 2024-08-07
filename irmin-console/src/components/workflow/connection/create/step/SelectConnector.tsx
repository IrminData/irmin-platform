'use client';

import Image from 'next/image';

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
          <Button
            className='flex flex-col items-center justify-center rounded-lg border p-4 transition duration-300 hover:shadow-lg'
            key={`connector-choice-${index}`}
            onClick={() => handleConnectorClick(connector)}
            ariaLabel={`${dict.workflow.connection.create.select} ${connector.name} ${dict.workflow.connection.create.connector}`}
          >
            <>
              <Image
                src={connector.logo}
                alt={connector.name}
                className='mb-2 h-[40px]'
                width={40}
                height={40}
              />
              <span className='text-sm'>{connector.name}</span>
            </>
          </Button>
        ))}
      </div>
      <div className='flex-grow'></div>
      <div className='mt-auto flex items-center justify-between border-t px-6 py-4'>
        <Button
          variant='solid'
          colorScheme='primary'
          size='sm'
          onClick={() => {
            irminAlert(
              'info',
              'This feature is not available yet. To build and use custom connectors, please contact support.'
            );
          }}
          ariaLabel='Add custom connector'
        >
          {dict.workflow.connection.create.addCustomConnector}
        </Button>
        <Button
          variant='link'
          colorScheme='primary'
          size='sm'
          href='/contact'
          target='_blank'
          ariaLabel='Go to support page'
        >
          {dict.workflow.connection.create.contactSupport}
        </Button>
      </div>
    </div>
  );
}
