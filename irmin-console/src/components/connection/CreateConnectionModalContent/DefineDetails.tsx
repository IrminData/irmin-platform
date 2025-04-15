'use client';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useCreateConnection } from '@/context/CreateConnectionContext';
import { useLocale } from '@/context/LocaleContext';

import { DynamicFields } from '@/types/internal/DynamicField';

export default function DefineDetails() {
  const { dict } = useLocale();
  const connectionCreation = useCreateConnection();

  if (
    connectionCreation.loading.fetchDetails ||
    !connectionCreation.connectionData.connectionDetailsFields
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
        connectionCreation.connectionData.name ??
        `${connectionCreation.connectionData.connector?.name ?? 'Connection'} ${Date.now()}`,
      example: dict.connections.create.connectionNamePlaceholder,
    },
    ...connectionCreation.connectionData.connectionDetailsFields,
  };

  return (
    <div className='p-4 pb-6'>
      {/* Display Connector Information */}
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
        onSubmit={connectionCreation.continueAndTestConnection}
        submitButtonText={dict.connections.create.continueAndTest}
        loading={connectionCreation.loading.testConnection}
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
        onClick={() => connectionCreation.goBack()}
      >
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
