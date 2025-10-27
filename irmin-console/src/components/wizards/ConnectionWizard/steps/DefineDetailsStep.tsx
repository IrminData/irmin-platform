'use client';

import { useCallback, useState } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import { ConnectionCreationSkeleton } from '@/components/ui/loading/ConnectionCreationSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectionConfiguration } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

import type { ConnectionWizardData } from '../types';

/**
 * Step component for defining connection details
 */
export default function DefineDetailsStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const [defaultTimestamp] = useState(() => Date.now());

  const {
    connectionConfigurationQuery,
    validateConnectorConfigurationMutation,
  } = useConnectionConfiguration('details', wizardData.connector?.id);

  const handleContinue = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        // Destructure to separate the connection name from details.
        const { irmin_connection_name, ...connectionDetails } = formValues;
        const newName =
          (irmin_connection_name as string) ||
          `${wizardData.connector?.name} ${defaultTimestamp}`;
        // Validate the connector configuration
        const res = await validateConnectorConfigurationMutation.mutateAsync({
          details: convertToConnectionFieldValues(connectionDetails),
          settings: wizardData.connectionSettings
            ? convertToConnectionFieldValues(wizardData.connectionSettings)
            : undefined,
        });
        if (res.data?.can_connect && res.data.connection_details_valid) {
          irminAlert('success', dict.connections.create.success);
          updateWizardData({
            name: newName,
            connectionDetails: connectionDetails,
          });
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
      wizardData.connectionSettings,
      wizardData.connector,
      validateConnectorConfigurationMutation,
      irminAlert,
      goNext,
      updateWizardData,
      dict,
      defaultTimestamp,
    ]
  );

  if (connectionConfigurationQuery.isLoading) {
    return <ConnectionCreationSkeleton variant='form' />;
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
        wizardData.name ??
        `${wizardData.connector?.name ?? 'Connection'} ${defaultTimestamp}`,
      example: dict.connections.create.connectionNamePlaceholder,
    },
    ...connectionDetailsFields,
  };

  return (
    <div className='space-y-6'>
      {/* Display Connector Information */}
      {wizardData.connector && (
        <div
          className={`
            flex flex-col justify-center border-b pb-4
            dark:border-gray-800
          `}
        >
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <ConnectorInfoSmall connector={wizardData.connector} />
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
      <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
