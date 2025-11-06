'use client';

import { useCallback } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnectionConfiguration, useConnections } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type { Connection } from '@/types/core/Connection';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

import type { ConnectionWizardData } from '../types';

/**
 * Step component for configuring and creating the connection
 */
export default function ConfigureConnectionStep({
  wizardData,
  updateWizardData,
  goBack,
  goToStep,
  closeModal,
  embedded = false,
  onComplete,
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  closeModal: () => void;
  embedded?: boolean;
  onComplete?: (connection: Connection) => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { createConnectionMutation } = useConnections();
  const { validateConnectorConfigurationMutation } = useConnectionConfiguration(
    'details',
    wizardData.connector?.id
  );

  // Fetch settings configuration to check if there are any settings fields
  const { connectionConfigurationQuery: settingsConfigurationQuery } =
    useConnectionConfiguration(
      'settings',
      wizardData.connector?.id,
      wizardData.connectionDetails
        ? convertToConnectionFieldValues(wizardData.connectionDetails)
        : undefined
    );

  const handleCreateConnection = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        updateWizardData({
          description: formValues.description as string,
        });

        // Validate connection configuration before creating
        const validationRes =
          await validateConnectorConfigurationMutation.mutateAsync({
            details: convertToConnectionFieldValues(
              wizardData.connectionDetails
            ),
            settings: convertToConnectionFieldValues(
              wizardData.connectionSettings
            ),
          });

        // Check if validation passed
        if (
          !validationRes.data?.ok ||
          !validationRes.data?.can_connect ||
          !validationRes.data?.connection_details_valid ||
          !validationRes.data?.connection_settings_valid
        ) {
          const errorMessage =
            validationRes.data?.errors?.join(', ') ??
            dict.connections.create.configuration_invalid;
          irminAlert('error', errorMessage);

          // Redirect user to the appropriate step based on which validation failed
          if (!validationRes.data?.connection_details_valid) {
            goToStep(2); // Go back to details step
          } else if (!validationRes.data?.connection_settings_valid) {
            goToStep(3); // Go back to settings step
          }
          return;
        }

        // Create connection only if validation passed
        const res = await createConnectionMutation.mutateAsync({
          connectorID: wizardData.connector?.id ?? '',
          name: wizardData.name,
          description: formValues.description as string,
          documentation: '',
          details: convertToConnectionFieldValues(wizardData.connectionDetails),
          settings: convertToConnectionFieldValues(
            wizardData.connectionSettings
          ),
        });
        if (!res.data) {
          throw new Error(res.message ?? 'Failed to create connection');
        }
        irminAlert('success', res.message ?? 'Connection created successfully');

        // Handle completion based on mode
        if (embedded && onComplete) {
          onComplete(res.data);
        } else {
          closeModal();
        }
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create connection'
        );
      }
    },
    [
      wizardData,
      createConnectionMutation,
      validateConnectorConfigurationMutation,
      closeModal,
      irminAlert,
      updateWizardData,
      goToStep,
      dict,
      embedded,
      onComplete,
    ]
  );

  // Custom back handler that skips settings step if there are no fields
  const handleBack = useCallback(() => {
    const settingsFields = settingsConfigurationQuery.data?.data;
    const hasSettingsFields =
      settingsFields && Object.keys(settingsFields).length > 0;

    if (!hasSettingsFields) {
      goToStep(2); // Go back to step 2 (details) if no settings
    } else {
      goBack(); // Go back to step 3 (settings) normally
    }
  }, [settingsConfigurationQuery.data?.data, goToStep, goBack]);

  // Prepare the fields for DynamicForm
  const formFields: DynamicFields = {
    description: {
      type: 'textarea',
      label: dict.connections.create.connectionDescription,
      required: true,
      default: wizardData.description,
      example: dict.connections.create.connectionDescriptionPlaceholder,
    },
  };

  return (
    <div className='space-y-6'>
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
        onSubmit={handleCreateConnection}
        loading={
          createConnectionMutation.isPending ||
          validateConnectorConfigurationMutation.isPending
        }
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
      <Button className='w-full' variant='ghost' size='sm' onClick={handleBack}>
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
