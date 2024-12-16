'use client';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
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
          <ConnectorInfoSmall connector={connectionData.connector} />
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
