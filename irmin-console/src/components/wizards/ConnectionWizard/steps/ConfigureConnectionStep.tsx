'use client';

import { useCallback, useState } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnectionConfiguration, useConnections } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type { Connection } from '@/types/core/Connection';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Tag } from '@/types/core/Tag';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

import type {
  ConnectionConfigurationSubmission,
  ConnectionWizardData,
  ConnectionWizardMode,
} from '../types';
import { hasUnchangedSecrets } from '../utils';

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
  mode = 'create',
  onSubmitConfiguration,
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  closeModal: () => void;
  embedded?: boolean;
  onComplete?: (connection: Connection) => void;
  mode?: ConnectionWizardMode;
  onSubmitConfiguration?: (
    payload: ConnectionConfigurationSubmission
  ) => Promise<IrminAPIResponse<Connection>>;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspaceContext();
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

  const handleTagsChange = useCallback(
    async (tags: Tag[]) => {
      updateWizardData({ tags });
      return tags;
    },
    [updateWizardData]
  );

  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const isEditMode = mode === 'edit';
  const detailsStep = isEditMode ? 1 : 2;
  const settingsStep = isEditMode ? 2 : 3;

  const handleSubmitConnection = useCallback(
    async (formValues?: DynamicFieldValues) => {
      try {
        const descriptionValue =
          (formValues?.description as string) ?? wizardData.description ?? '';

        if (!isEditMode) {
          updateWizardData({
            description: descriptionValue,
          });
        }

        // In edit mode, skip pre-save validation when stored secrets are
        // still the SECRET_PLACEHOLDER. The validate endpoint would pass the
        // literal placeholder through to the connector and fail auth; the
        // PATCH submit will preserve those secrets server-side.
        const skipValidation =
          isEditMode &&
          (hasUnchangedSecrets(wizardData.connectionDetails) ||
            hasUnchangedSecrets(wizardData.connectionSettings));

        if (!skipValidation) {
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
              goToStep(detailsStep);
            } else if (!validationRes.data?.connection_settings_valid) {
              goToStep(settingsStep);
            }
            return;
          }
        }

        const payload: ConnectionConfigurationSubmission = {
          details: convertToConnectionFieldValues(wizardData.connectionDetails),
          settings: convertToConnectionFieldValues(
            wizardData.connectionSettings
          ),
        };

        if (isEditMode) {
          if (!onSubmitConfiguration) {
            throw new Error('Missing update handler for edit mode');
          }
          setIsSubmittingEdit(true);
          try {
            const res = await onSubmitConfiguration(payload);
            if (!res.data) {
              throw new Error(
                res.message ?? dict.connections.config.updateFailed
              );
            }

            if (embedded && onComplete) {
              onComplete(res.data);
            } else {
              closeModal();
            }
          } finally {
            setIsSubmittingEdit(false);
          }
          return;
        }

        // Create connection only if validation passed
        const res = await createConnectionMutation.mutateAsync({
          connectorID: wizardData.connector?.id ?? '',
          name: wizardData.name,
          description: descriptionValue,
          documentation: '',
          details: payload.details,
          settings: payload.settings,
          tags: wizardData.tags?.map((t) => t.id),
        });
        if (!res.data) {
          throw new Error(
            res.message ?? dict.common.errors.mutations.createConnectionFailed
          );
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
        // In edit mode, the mutation's onError handler already shows the alert,
        // so we don't need to show it again here
        if (!isEditMode) {
          irminAlert(
            'error',
            (error as Error)?.message ??
              dict.common.errors.mutations.createConnectionFailed
          );
        }
      }
    },
    [
      wizardData,
      createConnectionMutation,
      validateConnectorConfigurationMutation,
      irminAlert,
      updateWizardData,
      goToStep,
      dict,
      embedded,
      onComplete,
      isEditMode,
      onSubmitConfiguration,
      closeModal,
      detailsStep,
      settingsStep,
    ]
  );

  // Custom back handler that skips settings step if there are no fields
  const handleBack = useCallback(() => {
    const settingsFields = settingsConfigurationQuery.data?.data;
    const hasSettingsFields =
      settingsFields && Object.keys(settingsFields).length > 0;

    if (!hasSettingsFields) {
      goToStep(detailsStep);
    } else {
      goBack();
    }
  }, [detailsStep, settingsConfigurationQuery.data?.data, goToStep, goBack]);

  // Prepare the fields for DynamicForm
  const formFields: DynamicFields | undefined = !isEditMode
    ? {
        description: {
          type: 'textarea',
          label: dict.connections.create.connectionDescription,
          required: false,
          default: wizardData.description,
          example: dict.connections.create.connectionDescriptionPlaceholder,
        },
      }
    : undefined;

  return (
    <div className='space-y-6'>
      {wizardData.connector && (
        <div className={`flex flex-col justify-center border-b pb-4`}>
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <ConnectorInfoSmall connector={wizardData.connector} />
        </div>
      )}

      {/* Dynamic Form Render */}
      {!isEditMode && formFields ? (
        <DynamicForm
          fields={formFields}
          onSubmit={handleSubmitConnection}
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
      ) : (
        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            {dict.connections.config.editDescription}
          </p>
          <Button
            className='w-full'
            variant='accent'
            size='lg'
            loading={
              isSubmittingEdit ||
              validateConnectorConfigurationMutation.isPending
            }
            onClick={() => handleSubmitConnection()}
          >
            {dict.connections.config.updateConfiguration}
          </Button>
        </div>
      )}

      {!isEditMode && (
        <div className='space-y-2'>
          <WorkspaceTagSelector
            selectedTags={wizardData.tags ?? []}
            onTagsChange={handleTagsChange}
            loading={false}
            disabled={createConnectionMutation.isPending}
            workspaceSlug={workspaceSlug}
          />
        </div>
      )}

      {/* Go Back Button */}
      <Button className='w-full' variant='ghost' size='sm' onClick={handleBack}>
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
