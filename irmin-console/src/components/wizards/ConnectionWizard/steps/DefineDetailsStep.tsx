'use client';

import { useCallback, useMemo, useState } from 'react';

import IrminCore from '@/lib/core';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import { ConnectionCreationSkeleton } from '@/components/ui/loading/ConnectionCreationSkeleton';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectionConfiguration } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

import type { ConnectionWizardData, ConnectionWizardMode } from '../types';
import { populateFieldDefaults } from '../utils';

/**
 * Step component for defining connection details
 */
export default function DefineDetailsStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
  goToStep,
  mode = 'create',
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
  goToStep?: (step: number) => void;
  mode?: ConnectionWizardMode;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();
  const { getToken } = useIAM();
  const [defaultTimestamp] = useState(() => Date.now());
  const isEditMode = mode === 'edit';
  const configureStep = isEditMode ? 3 : 4;

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

          // Fetch settings configuration with the NEW connection details
          const token = await getToken();
          const core = new IrminCore(locale, token);
          const settingsConfigRes =
            await core.connectorService.fetchConnectorConfigurationFields({
              connectorId: wizardData.connector?.id ?? '',
              configurationType: 'settings',
              currentDetails: convertToConnectionFieldValues(connectionDetails),
            });

          // Check if there are settings fields to configure
          const settingsFields = settingsConfigRes.data;
          const hasSettingsFields =
            settingsFields && Object.keys(settingsFields).length > 0;

          // Skip settings step if there are no fields
          if (!hasSettingsFields) {
            if (goToStep) {
              goToStep(configureStep);
              return;
            }
            goNext();
            return;
          }
          goNext();
        } else {
          // Show specific validation errors if available
          const errors = res.data?.errors;
          if (errors && errors.length > 0) {
            irminAlert('error', errors.join('\n'));
          } else {
            irminAlert('error', dict.connections.create.failed);
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
      wizardData.connectionSettings,
      wizardData.connector,
      validateConnectorConfigurationMutation,
      irminAlert,
      goNext,
      goToStep,
      updateWizardData,
      dict,
      defaultTimestamp,
      getToken,
      locale,
      configureStep,
    ]
  );

  const formFields = useMemo(() => {
    const connectorFields = populateFieldDefaults(
      connectionConfigurationQuery.data?.data ?? undefined,
      wizardData.connectionDetails
    );

    const defaultName =
      wizardData.name ??
      `${wizardData.connector?.name ?? 'Connection'} ${defaultTimestamp}`;

    const formFields: DynamicFields = {
      irmin_connection_name: {
        type: 'text',
        label: dict.connections.create.connectionName,
        required: true,
        default: defaultName,
        example: dict.connections.create.connectionNamePlaceholder,
      },
      ...connectorFields,
    };
    if (isEditMode) {
      return connectorFields;
    }

    return formFields;
  }, [
    connectionConfigurationQuery.data?.data,
    dict.connections.create.connectionName,
    dict.connections.create.connectionNamePlaceholder,
    defaultTimestamp,
    wizardData.connectionDetails,
    wizardData.connector?.name,
    wizardData.name,
    isEditMode,
  ]);

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
