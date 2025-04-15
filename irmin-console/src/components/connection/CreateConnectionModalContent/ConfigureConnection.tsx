'use client';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';

import { useCreateConnection } from '@/context/CreateConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { DynamicFields } from '@/types/internal/DynamicField';

/**
 * Configure connection component for finalizing the connection setup.
 */
export default function ConfigureConnection() {
  const { dict } = useLocale();
  const connectionCreation = useCreateConnection();

  // Prepare the fields for DynamicForm
  const formFields: DynamicFields = {
    description: {
      type: 'textarea',
      label: dict.connections.create.connectionDescription,
      required: true,
      default: connectionCreation.connectionData.description,
      example: dict.connections.create.connectionDescriptionPlaceholder,
    },
  };

  return (
    <div className='p-4 pb-6'>
      {connectionCreation.connectionData.connector && (
        <div className='flex flex-col justify-center border-b py-4 dark:border-gray-800'>
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <ConnectorInfoSmall
            connector={connectionCreation.connectionData.connector}
          />
        </div>
      )}

      {/* Dynamic Form Render */}
      <DynamicForm
        fields={formFields}
        onSubmit={connectionCreation.createConnection}
        submitButtonText={dict.connections.create.createConnection}
        formProps={{
          autoCapitalize: 'none',
          autoComplete: 'off',
          autoCorrect: 'off',
          autoSave: 'off',
          autoFocus: true,
        }}
      />

      {/* Go Back Button */}
      <Button
        className='mb-6 inline-block w-full'
        variant='ghost'
        size='sm'
        onClick={connectionCreation.goBack}
      >
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
