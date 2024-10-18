'use client';

import { useCallback, useRef } from 'react';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useConnection } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

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
 */
const ConnectionSettingsSection = () => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    connections: { updateConnection, reassignConnection, deleteConnection },
  } = useWorkspace();
  const { connection } = useConnection();

  const updating = useRef(false);

  /**
   * Updates the connection with the new details provided
   */
  const handleUpdateConnection = useCallback(
    async (data: ConnectionFormValues) => {
      if (updating.current) return;
      try {
        updating.current = true;
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
              res.message ?? 'Connection reassigned successfully'
            );
          }
        }

        // Update other connection details
        const res = await updateConnection(connection.id, {
          ...connection,
          name: data.name.trim(),
          description: data.description.trim(),
        });

        irminAlert('success', res.message ?? 'Connection updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error updating the connection'
        );
      } finally {
        updating.current = false;
      }
    },
    [
      connection,
      currentWorkspace,
      updateConnection,
      reassignConnection,
      irminAlert,
    ]
  );

  /**
   * Deletes the connection after confirming with the user
   */
  const handleDeleteConnection = useCallback(async () => {
    if (updating.current) return;
    try {
      const confirmed = await irminConfirm(
        'warning',
        dict.connections.settings.areYouSureYouWantToDelete
      );
      if (!confirmed) return;
      updating.current = true;
      const res = await deleteConnection(connection.id);
      irminAlert('success', res.message ?? 'Connection deleted successfully');
    } catch (error) {
      console.error('Failed to delete connection', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the connection'
      );
    } finally {
      updating.current = false;
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
    <div id='connection-settings-section'>
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
