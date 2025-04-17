'use client';

import { useCallback, useState } from 'react';

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
 * Handles connection settings updates, transferment, and deletion.
 * Uses {@link SettingsForm} to show and edit the connection settings.
 */
const ConnectionSettingsSection = () => {
  const { dict } = useLocale();
  const { users } = useUsers();
  const { connection, transferConnection, updateConnection, deleteConnection } =
    useConnection();

  const [submitting, setSubmitting] = useState(false);
  const handleUpdateConnection = useCallback(
    async (data: ConnectionFormValues) => {
      try {
        setSubmitting(true);
        if (data.owner !== connection.owner.id) {
          await transferConnection(data.owner);
        }
        await updateConnection({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        console.error('Error updating connection:', error);
      } finally {
        setSubmitting(false);
      }
    },
    [connection, updateConnection, transferConnection]
  );

  // Define field configurations
  const fieldConfiguration: FieldConfig<ConnectionFormValues>[] = [
    {
      name: 'name',
      label: dict.common.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.common.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.list.owner,
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
        submitting={submitting}
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
