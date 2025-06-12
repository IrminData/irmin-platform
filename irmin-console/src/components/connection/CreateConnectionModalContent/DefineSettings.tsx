'use client';

import { Dispatch, SetStateAction, useCallback } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectionConfiguration } from '@/hooks/useConnectionConfiguration';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import { DynamicFieldValues } from '@/types/internal/DynamicField';

export default function DefineSettings({
  connectionData,
  setConnectionData,
  goBack,
  goNext,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: Dispatch<SetStateAction<ConnectionSetup>>;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const {
    connectionConfigurationQuery,
    validateConnectorConfigurationMutation,
  } = useConnectionConfiguration(
    'settings',
    connectionData.connector?.id,
    connectionData.connectionDetails
  );

  const handleContinue = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        // Validate the connector configuration
        const res = await validateConnectorConfigurationMutation.mutateAsync({
          details: connectionData.connectionDetails,
          settings: formValues,
        });
        if (res.data?.can_connect && res.data.connection_settings_valid) {
          irminAlert('success', dict.connections.create.configuration_valid);
          setConnectionData((prev) => ({
            ...prev,
            connectionSettings: formValues,
          }));
          goNext();
        } else {
          irminAlert('error', dict.connections.create.configuration_invalid);
        }
      } catch (error) {
        console.error('Test connection error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to test connection'
        );
      }
    },
    [
      connectionData.connectionDetails,
      validateConnectorConfigurationMutation,
      irminAlert,
      setConnectionData,
      goNext,
      dict,
    ]
  );

  if (connectionConfigurationQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (connectionConfigurationQuery.isError) {
    return (
      <div>
        {dict.common.error}: {connectionConfigurationQuery.error.message}
      </div>
    );
  }

  return (
    <div className='p-4 pb-6'>
      {/* Display Connector Information */}
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
        fields={connectionConfigurationQuery.data?.data ?? {}}
        onSubmit={handleContinue}
        submitButtonText={dict.connections.create.continue}
        loading={validateConnectorConfigurationMutation.isPending}
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
        onClick={goBack}
      >
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
