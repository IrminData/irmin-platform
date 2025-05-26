'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useUsers } from '@/hooks/useUsers';

import LoadingSkeleton from '../ui/loading/LoadingSkeleton';

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
  const { usersQuery } = useUsers();
  const { irminConfirm } = usePopup();
  const router = useRouter();
  const {
    connectionQuery,
    transferConnectionMutation,
    updateConnectionMutation,
    deleteConnectionMutation,
  } = useConnectionContext();
  const { workspaceSlug } = useWorkspaceContext();

  const handleUpdateConnection = useCallback(
    async (data: ConnectionFormValues) => {
      try {
        if (data.owner !== connectionQuery.data?.data?.owner.id) {
          await transferConnectionMutation.mutateAsync(data.owner);
        }
        await updateConnectionMutation.mutateAsync({
          name: data.name,
          description: data.description,
          documentation: connectionQuery.data?.data?.documentation ?? '',
        });
      } catch (error) {
        console.error('Error updating connection:', error);
      }
    },
    [
      connectionQuery.data?.data,
      transferConnectionMutation,
      updateConnectionMutation,
    ]
  );

  const handleDeleteConnection = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${connectionQuery.data?.data?.name})`
    );
    if (!confirmed) return;
    await deleteConnectionMutation.mutateAsync();
    router.push(`/workspace/${workspaceSlug}/connections`);
  }, [
    deleteConnectionMutation,
    irminConfirm,
    connectionQuery.data?.data?.name,
    dict,
    router,
    workspaceSlug,
  ]);

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
        usersQuery.data?.data?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  if (connectionQuery.isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (connectionQuery.isError) {
    return connectionQuery.error.message;
  }

  if (!connectionQuery.data?.data) {
    return <div>{dict.common.error}</div>;
  }

  const connection = connectionQuery.data.data;

  return (
    <div id='connection-settings-section'>
      <SettingsForm<ConnectionFormValues>
        initialValues={{
          name: connection.name,
          description: connection.description,
          owner: connection.owner.id,
        }}
        onSubmit={handleUpdateConnection}
        submitting={
          updateConnectionMutation.isPending ||
          transferConnectionMutation.isPending
        }
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteConnection}
        deleteItemLoading={deleteConnectionMutation.isPending}
        itemName='Connection'
        submitButtonLabel={dict.connections.settings.saveChanges}
        deleteButtonLabel={dict.connections.settings.delete}
        dangerZoneMessage={dict.connections.settings.deletionNote}
      />
    </div>
  );
};

export default ConnectionSettingsSection;
