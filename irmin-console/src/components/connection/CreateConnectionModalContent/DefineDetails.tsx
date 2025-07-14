'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectionConfiguration } from '@/hooks/useConnectionConfiguration';

import type { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

export default function DefineDetails({
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
  } = useConnectionConfiguration('details', connectionData.connector?.id);

  const handleContinue = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        // Destructure to separate the connection name from details.
        const { irmin_connection_name, ...connectionDetails } = formValues;
        const newName =
          (irmin_connection_name as string) ||
          `${connectionData.connector?.name} ${Date.now()}`;
        // Validate the connector configuration
        const res = await validateConnectorConfigurationMutation.mutateAsync({
          details: connectionDetails,
          settings: connectionData.connectionSettings,
        });
        if (res.data?.can_connect && res.data.connection_details_valid) {
          irminAlert('success', dict.connections.create.success);
          setConnectionData((prev) => ({
            ...prev,
            name: newName,
            connectionDetails: connectionDetails,
          }));
          goNext();
        } else {
          irminAlert('error', dict.connections.create.failed);
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
      connectionData.connectionSettings,
      connectionData.connector,
      validateConnectorConfigurationMutation,
      irminAlert,
      goNext,
      setConnectionData,
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

  const connectionDetailsFields = connectionConfigurationQuery.data?.data;

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
    ...connectionDetailsFields,
  };

  return (
    <div className='p-4 pb-6'>
      {/* Display Connector Information */}
      {connectionData.connector && (
        <div
          className={`
            flex flex-col justify-center border-b py-4
            dark:border-gray-800
          `}
        >
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <ConnectorInfoSmall connector={connectionData.connector} />
        </div>
      )}

      {/* Dynamic Form Render */}
      <DynamicForm
        fields={formFields}
        onSubmit={handleContinue}
        submitButtonText={dict.connections.create.continueAndTest}
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
