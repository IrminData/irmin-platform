'use client';

import React, { useCallback } from 'react';

import SettingsForm, {
  FieldConfig,
} from '@/components/common/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Connection } from '@/types/core/Connection';

interface ConnectionFormValues {
  name: string;
  description: string;
  owner: string;
}

/**
 * Connection Settings section component
 *
 * Handles connection settings updates, reassignment, and deletion.
 * Uses {@link SettingsForm} to show and edit the connection settings.
 *
 * @param props - The props
 * @param props.connection - The connection to view and edit settings for
 */
const ConnectionSettingsSection = ({
  connection,
}: {
  connection: Connection;
}) => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    connections: { updateConnection, reassignConnection, deleteConnection },
  } = useWorkspace();

  /**
   * Updates the connection with the new details provided
   */
  const handleUpdateConnection = useCallback(
    async (data: ConnectionFormValues) => {
      try {
        if (!connection) return;

        // Check if the owner has changed
        if (data.owner && data.owner !== connection.owner.id) {
          // Find the new owner object
          const newOwner = currentWorkspace?.users?.find(
            (user) => user.id === data.owner
          );
          if (newOwner) {
            // Change the owner if it's different and found
            const res = await reassignConnection(connection.id, newOwner);
            irminAlert(
              'success',
              res.message ?? dict.connections.settings.connectionOwnerChanged
            );
          }
        }

        // Update other connection details
        const res = await updateConnection(connection.id, {
          ...connection,
          name: data.name.trim(),
          description: data.description.trim(),
        });

        irminAlert(
          'success',
          res.message ?? dict.connections.settings.connectionUpdated
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            dict.connections.settings.errorUpdatingConnection
        );
      }
    },
    [
      connection,
      currentWorkspace,
      updateConnection,
      reassignConnection,
      irminAlert,
      dict,
    ]
  );

  /**
   * Deletes the connection after confirming with the user
   */
  const handleDeleteConnection = useCallback(() => {
    try {
      irminConfirm(
        'warning',
        dict.connections.settings.areYouSureYouWantToDelete,
        async (confirmed) => {
          if (!confirmed) return;
          const res = await deleteConnection(connection.id);
          irminAlert(
            'success',
            res.message ?? dict.connections.settings.connectionDeleted
          );
        }
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.connections.settings.errorDeletingConnection
      );
    }
  }, [connection, irminConfirm, deleteConnection, irminAlert, dict]);

  // Define field configurations
  const fieldConfiguration: FieldConfig<ConnectionFormValues>[] = [
    {
      name: 'name',
      label: dict.connections.settings.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.connections.settings.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.connections.settings.owner,
      type: 'select',
      options:
        currentWorkspace?.users?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  return (
    <div
      className='container relative mx-auto my-8 max-w-6xl'
      id='connection-settings-section'
    >
      <SettingsForm<ConnectionFormValues>
        initialValues={{
          name: connection.name,
          description: connection.description,
          owner: connection.owner.id,
        }}
        onSubmit={handleUpdateConnection}
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteConnection}
        itemName='Connection'
        submitButtonLabel={dict.connections.settings.saveChanges}
        deleteButtonLabel={dict.connections.settings.delete}
        dangerZoneMessage={dict.connections.settings.deletionNote}
      />
    </div>
  );
};

export default ConnectionSettingsSection;
