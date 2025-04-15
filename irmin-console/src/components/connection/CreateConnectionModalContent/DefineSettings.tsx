'use client';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useCreateConnection } from '@/context/CreateConnectionContext';
import { useLocale } from '@/context/LocaleContext';

export default function DefineSettings() {
  const { dict } = useLocale();
  const connectionCreation = useCreateConnection();

  if (
    connectionCreation.loading.fetchSettings ||
    !connectionCreation.connectionData.connectionSettingsFields
  ) {
    return <LoadingSpinner />;
  }

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
        fields={connectionCreation.connectionData.connectionSettingsFields}
        onSubmit={connectionCreation.continueCreateConnection}
        submitButtonText={dict.connections.create.continue}
        loading={connectionCreation.loading.continueCreate}
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
