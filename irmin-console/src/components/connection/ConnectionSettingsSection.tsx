'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { FieldConfig } from '@/components/ui/form/SettingsForm';
import SettingsForm from '@/components/ui/form/SettingsForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useUsers } from '@/hooks/useUsers';
import { useWorkspaceTags } from '@/hooks/useWorkspaceTags';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import type { Tag } from '@/types/core/Tag';
import { TagEntityType } from '@/types/core/Tag';

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
  const { isResourceAllowed } = useResourceAllowed();

  const [submitting, setSubmitting] = useState(false);

  const handleUpdateConnection = useCallback(
    async (data: ConnectionFormValues) => {
      try {
        setSubmitting(true);
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
      } finally {
        setSubmitting(false);
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

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags();

  const canViewTags = useMemo(
    () =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Read) &&
      isResourceAllowed(
        PolicyResource.Connection,
        PolicyAction.Read,
        connectionQuery.data?.data?.id
      ),
    [isResourceAllowed, connectionQuery.data?.data?.id]
  );

  const canChangeTags = useMemo(
    () =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Create) &&
      isResourceAllowed(
        PolicyResource.Connection,
        PolicyAction.Update,
        connectionQuery.data?.data?.id
      ),
    [isResourceAllowed, connectionQuery.data?.data?.id]
  );

  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    connectionQuery.data?.data?.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');

  // Sync selectedTags with connection data changes
  useEffect(() => {
    setSelectedTags(connectionQuery.data?.data?.tags ?? []);
  }, [connectionQuery.data?.data?.tags]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      try {
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        // Use connectionQuery.data?.data?.tags directly instead of selectedTags to avoid race condition
        const currentTags = connectionQuery.data?.data?.tags ?? [];
        setSelectedTags(tags);
        setUpdatingTags(true);

        const tagsToAdd = [];
        const tagsToRemove = [];
        for (const tag of tags) {
          if (!currentTags.some((t) => t.id === tag.id)) {
            tagsToAdd.push(tag);
          }
        }
        for (const tag of currentTags) {
          if (!tags.some((t) => t.id === tag.id)) {
            tagsToRemove.push(tag);
          }
        }
        const connectionId = connectionQuery.data?.data?.id;
        if (!connectionId) return tags;

        await Promise.all([
          ...tagsToAdd.map((tag) =>
            addTagToEntityMutation.mutateAsync({
              id: tag.id,
              entityType: TagEntityType.Connection,
              entityId: connectionId,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: TagEntityType.Connection,
              entityId: connectionId,
            })
          ),
        ]);

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        return [];
      } finally {
        setUpdatingTags(false);
      }
    },
    [
      addTagToEntityMutation,
      removeTagFromEntityMutation,
      connectionQuery.data?.data?.id,
      connectionQuery.data?.data?.tags,
    ]
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
        usersQuery.data?.data?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  if (connectionQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (connectionQuery.isError) {
    return (
      <div>
        {dict.common.error}: {connectionQuery.error.message}
      </div>
    );
  }

  if (!connectionQuery.data?.data) {
    return <></>;
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
          submitting ||
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
        disabled={
          !isResourceAllowed(
            PolicyResource.Connection,
            PolicyAction.Update,
            connection.id
          )
        }
        deleteButtonDisabled={
          !isResourceAllowed(
            PolicyResource.Connection,
            PolicyAction.Delete,
            connection.id
          )
        }
        additionalContentRight={
          <>
            {canViewTags && (
              <div
                className={`
                  border-b border-gray-200 pb-4
                  dark:border-gray-800
                `}
              >
                <WorkspaceTagSelector
                  selectedTags={selectedTags}
                  onTagsChange={handleUpdateTags}
                  loading={updatingTags}
                  disabled={!canChangeTags}
                />
              </div>
            )}
          </>
        }
      />
    </div>
  );
};

export default ConnectionSettingsSection;
