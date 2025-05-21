'use client';

import { Dispatch, SetStateAction, useCallback } from 'react';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnections } from '@/hooks/useConnections';

import { CustomFieldValues } from '@/types/core/Connection';
import { ConnectionSetup } from '@/types/internal/ConnectionSetup';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

/**
 * Configure connection component for finalizing the connection setup.
 */
export default function ConfigureConnection({
  connectionData,
  setConnectionData,
  goBack,
  closeModal,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: Dispatch<SetStateAction<ConnectionSetup>>;
  goBack: () => void;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { createConnectionMutation } = useConnections();

  const handleCreateConnection = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        setConnectionData((prev) => ({
          ...prev,
          description: formValues.description as string,
        }));
        const res = await createConnectionMutation.mutateAsync({
          connectorID: connectionData.connector?.id ?? '',
          name: connectionData.name,
          description: formValues.description as string,
          documentation: '',
          details: (connectionData.connectionDetails ??
            {}) as CustomFieldValues,
          settings: (connectionData.connectionSettings ??
            {}) as CustomFieldValues,
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
      connectionData,
      createConnectionMutation,
      closeModal,
      irminAlert,
      setConnectionData,
    ]
  );

  // Prepare the fields for DynamicForm
  const formFields: DynamicFields = {
    description: {
      type: 'textarea',
      label: dict.connections.create.connectionDescription,
      required: true,
      default: connectionData.description,
      example: dict.connections.create.connectionDescriptionPlaceholder,
    },
  };

  return (
    <div className='p-4 pb-6'>
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
