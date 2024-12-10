'use client';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';

import { useLocale } from '@/context/LocaleContext';

import { useCreateConnection } from '@/hooks/useCreateConnection';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import { DynamicFields } from '@/types/internal/DynamicField';

/**
 * Configure connection component for finalizing the connection setup.
 *
 * @param props - Component props
 * @param props.connectionData - Current state of the connection setup
 * @param props.setConnectionData - Setter for the connection state
 * @param props.setCurrentStep - Setter for the current step of the connection setup
 * @param props.closeModal - Function to close the modal
 */
export default function ConfigureConnection({
  connectionData,
  setCurrentStep,
  closeModal,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { createConnection } = useCreateConnection(connectionData, closeModal);

  // Prepare the fields for DynamicForm
  const formFields: DynamicFields = {
    description: {
      type: 'textarea',
      label: dict.connections.create.connectionDescription,
      required: true,
      default: connectionData.description,
      example: dict.connections.create.connectionDescriptionPlaceholder,
    },
  };

  return (
    <div className='p-4 pb-6'>
      {connectionData.connector && (
        <div className='flex flex-col justify-center border-b py-4 dark:border-gray-800'>
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <div className='flex w-full flex-row items-center gap-4'>
            <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-card px-4 py-2 text-left text-sm text-card-foreground shadow'>
              <Image
                src={connectionData.connector.logo_url}
                alt={connectionData.connector.name}
                className='h-12 w-12 object-contain'
                width={48}
                height={48}
              />
              <div className='flex flex-col justify-start gap-1'>
                {connectionData.connector.primary_category && (
                  <Badge variant='secondary'>
                    {connectionData.connector.primary_category}
                  </Badge>
                )}
                <p>{connectionData.connector.name}</p>
              </div>
            </div>
            <div className='flex max-w-64 flex-col gap-1'>
              <p className='text-sm opacity-80'>
                {connectionData.connector.description}
              </p>
              {connectionData.connector.read_more_url && (
                <Button
                  variant='link'
                  target='_blank'
                  className='h-max p-0'
                  rel='noopener noreferrer'
                  href={connectionData.connector.read_more_url}
                >
                  {dict.connections.create.learnMore}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Form Render */}
      <DynamicForm
        fields={formFields}
        onSubmit={createConnection}
        submitButtonText={dict.connections.create.createConnection}
      />

      {/* Go Back Button */}
      <Button
        className='mb-6 inline-block w-full'
        variant='ghost'
        size='sm'
        onClick={() => setCurrentStep((currentStep) => currentStep - 1)}
      >
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
