'use client';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import {
  useContinueAndTestConnection,
  useFetchConnectionDetails,
} from '@/hooks/useCreateConnection';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import { DynamicFields } from '@/types/internal/DynamicField';

export default function DefineDetails({
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();
  const { loading: loadingDetails } = useFetchConnectionDetails(
    connectionData,
    setConnectionData
  );
  const { loading: loadingTest, continueAndTestConnection } =
    useContinueAndTestConnection(
      connectionData,
      setConnectionData,
      setCurrentStep
    );

  if (
    loadingDetails ||
    loadingTest ||
    !connectionData.connectionDetailsFields
  ) {
    return <LoadingSpinner />;
  }

  // Prepare the fields for DynamicForm
  const formFields: DynamicFields = {
    irmin_connection_name: {
      type: 'text',
      label: dict.connections.create.connectionName,
      required: true,
      default:
        connectionData.name ??
        `${connectionData.connector?.name ?? 'Connection'} ${Date.now()}`,
      example: dict.connections.create.connectionNamePlaceholder,
    },
    ...connectionData.connectionDetailsFields,
  };

  return (
    <div className='p-4 pb-6'>
      {/* Display Connector Information */}
      {connectionData.connector && (
        <div className='flex flex-col justify-center border-b py-4 dark:border-gray-800'>
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <div className='flex w-full flex-row items-center gap-4'>
            <div className='flex w-max flex-row items-center justify-start gap-4 rounded-lg bg-card px-4 py-2 text-left text-sm text-card-foreground shadow'>
              <Image
                src={connectionData.connector.logo}
                alt={connectionData.connector.name}
                className='h-12 w-12 object-contain'
                width={48}
                height={48}
              />
              <div className='flex flex-col justify-start gap-1'>
                <Badge variant='secondary'>
                  {connectionData.connector.category}
                </Badge>
                <p>{connectionData.connector.name}</p>
              </div>
            </div>
            <div className='flex max-w-64 flex-col gap-1'>
              <p className='text-sm opacity-80'>
                {connectionData.connector.description}
              </p>
              {connectionData.connector.url && (
                <Button
                  variant='link'
                  target='_blank'
                  className='h-max p-0'
                  rel='noopener noreferrer'
                  href={connectionData.connector.url}
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
        onSubmit={continueAndTestConnection}
        submitButtonText={dict.connections.create.continueAndTest}
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
