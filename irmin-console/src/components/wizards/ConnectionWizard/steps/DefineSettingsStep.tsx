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

import type { ConnectionWizardData, ConnectionWizardMode } from '../types';
import { hasUnchangedSecrets, populateFieldDefaults } from '../utils';

/**
 * Step component for defining connection settings
 */
export default function DefineSettingsStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
  mode = 'create',
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
  mode?: ConnectionWizardMode;
}) {
  const isEditMode = mode === 'edit';
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
        wizardData.connectionSettings,
        isEditMode
          ? { secretHelpText: dict.connections.config.secretUnchangedHelp }
          : undefined
      ),
    [
      connectionConfigurationQuery.data?.data,
      wizardData.connectionSettings,
      isEditMode,
      dict.connections.config.secretUnchangedHelp,
    ]
  );

  // OAuth path: when the connector authenticates via OAuth, the wizard
  // doesn't collect details (the ConnectOAuthStep replaces the details
  // form). Validating settings here would call the validate endpoint
  // with empty details and fail can_connect / connection_details_valid,
  // surfacing an unresolvable error to a user with no details form to
  // fix it in. Skip pre-save validation on this step the same way
  // ConfigureConnectionStep does — runtime auth is bound to the OAuth
  // token Core stores per connection, and the connector's own pull/push
  // path will catch real misconfiguration.
  const isOAuthPath =
    !isEditMode && !!wizardData.connector?.connection_oauth_config;

  const handleContinue = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        // OAuth path: store settings and advance without validating.
        // Mirrors the skip in ConfigureConnectionStep.
        if (isOAuthPath) {
          updateWizardData({ connectionSettings: formValues });
          goNext();
          return;
        }

        // In edit mode, skip validation when any stored secret is still the
        // backend SECRET_PLACEHOLDER — validating would fail because the
        // connector receives the literal placeholder. PATCH will preserve
        // stored secrets on submit.
        if (
          isEditMode &&
          (hasUnchangedSecrets(wizardData.connectionDetails) ||
            hasUnchangedSecrets(formValues))
        ) {
          updateWizardData({ connectionSettings: formValues });
          goNext();
          return;
        }

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
          (error as Error)?.message ??
            dict.common.errors.mutations.testConnectionFailed
        );
      }
    },
    [
      isOAuthPath,
      wizardData.connectionDetails,
      validateConnectorConfigurationMutation,
      irminAlert,
      updateWizardData,
      goNext,
      dict,
      isEditMode,
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
        title={dict.common.errors.failedToLoadConnector}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }

  return (
    <div className='space-y-6'>
      {/* Display Connector Information */}
      {wizardData.connector && (
        <div className={`flex flex-col justify-center border-b pb-4`}>
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
        submitButtonText={dict.common.continue}
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
