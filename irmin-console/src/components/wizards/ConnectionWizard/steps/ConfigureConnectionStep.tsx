'use client';

import { useCallback } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnections } from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

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
  closeModal,
}: {
  wizardData: ConnectionWizardData;
  updateWizardData: (updates: Partial<ConnectionWizardData>) => void;
  goBack: () => void;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { createConnectionMutation } = useConnections();

  const handleCreateConnection = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        updateWizardData({
          description: formValues.description as string,
        });
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
        closeModal();
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
      closeModal,
      irminAlert,
      updateWizardData,
    ]
  );

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
        loading={createConnectionMutation.isPending}
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
      <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
