'use client';

import { useCallback, useEffect, useMemo } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import DynamicForm from '@/components/ui/form/DynamicForm';
import { ConnectionCreationSkeleton } from '@/components/ui/loading/ConnectionCreationSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectionConfiguration } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type { DynamicFieldValues } from '@/types/internal/DynamicField';

import type { ConnectionWizardData } from '../types';
import { populateFieldDefaults } from '../utils';

/**
 * Step component for defining connection settings
 */
export default function DefineSettingsStep({
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

  const {
    connectionConfigurationQuery,
    validateConnectorConfigurationMutation,
  } = useConnectionConfiguration(
    'settings',
    wizardData.connector?.id,
    wizardData.connectionDetails
      ? convertToConnectionFieldValues(wizardData.connectionDetails)
      : undefined
  );

  // Auto-skip if there are no settings fields
  useEffect(() => {
    const settingsFields = connectionConfigurationQuery.data?.data;
    const hasSettingsFields =
      settingsFields && Object.keys(settingsFields).length > 0;

    if (!connectionConfigurationQuery.isLoading && !hasSettingsFields) {
      // No settings fields, skip to next step
      goNext();
    }
  }, [
    connectionConfigurationQuery.isLoading,
    connectionConfigurationQuery.data?.data,
    goNext,
  ]);

  const settingsFields = useMemo(
    () =>
      populateFieldDefaults(
        connectionConfigurationQuery.data?.data ?? undefined,
        wizardData.connectionSettings
      ),
    [connectionConfigurationQuery.data?.data, wizardData.connectionSettings]
  );

  const handleContinue = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        // Validate the connector configuration
        const res = await validateConnectorConfigurationMutation.mutateAsync({
          details: wizardData.connectionDetails
            ? convertToConnectionFieldValues(wizardData.connectionDetails)
            : undefined,
          settings: convertToConnectionFieldValues(formValues),
        });
        if (res.data?.can_connect && res.data.connection_settings_valid) {
          irminAlert('success', dict.connections.create.configuration_valid);
          updateWizardData({
            connectionSettings: formValues,
          });
          goNext();
        } else {
          // Show specific validation errors if available
          const errors = res.data?.errors;
          if (errors && errors.length > 0) {
            irminAlert('error', errors.join('\n'));
          } else {
            irminAlert('error', dict.connections.create.configuration_invalid);
          }
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
      wizardData.connectionDetails,
      validateConnectorConfigurationMutation,
      irminAlert,
      updateWizardData,
      goNext,
      dict,
    ]
  );

  if (connectionConfigurationQuery.isLoading) {
    return <ConnectionCreationSkeleton variant='form' />;
  }

  if (connectionConfigurationQuery.isError) {
    return (
      <QueryError
        error={connectionConfigurationQuery.error}
        onRetry={() => connectionConfigurationQuery.refetch()}
        title={dict.common.error}
      />
    );
  }

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
        fields={settingsFields}
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
      <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
