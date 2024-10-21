'use client';

import { useCallback } from 'react';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useConnection } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { useUsers } from '@/context/UsersContext';

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
  const { users } = useUsers();
  const { connection, reassignConnection, updateConnection, deleteConnection } =
    useConnection();

  const handleUpdateConnection = useCallback(
    async (data: ConnectionFormValues) => {
      if (data.owner !== connection.owner.id) {
        await reassignConnection(data.owner);
      }
      await updateConnection({
        name: data.name,
        description: data.description,
      });
    },
    [connection, updateConnection, reassignConnection]
  );

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
        users.map((user) => ({
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
        deleteItem={deleteConnection}
        itemName='Connection'
        submitButtonLabel={dict.connections.settings.saveChanges}
        deleteButtonLabel={dict.connections.settings.delete}
        dangerZoneMessage={dict.connections.settings.deletionNote}
      />
    </div>
  );
};

export default ConnectionSettingsSection;
