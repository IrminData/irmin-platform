'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { connectionQueryKey } from '@/lib/queryKeys';

import type { FieldConfig } from '@/components/ui/form/SettingsForm';
import SettingsForm from '@/components/ui/form/SettingsForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useUsers, useWorkspaceTags } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

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
  const queryClient = useQueryClient();

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
    if (!connectionQuery.data?.data?.id) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${connectionQuery.data?.data?.name})`
    );
    if (!confirmed) return;
    await deleteConnectionMutation.mutateAsync(connectionQuery.data?.data?.id);
    router.push(`/workspace/${workspaceSlug}/connections`);
  }, [
    deleteConnectionMutation,
    irminConfirm,
    connectionQuery.data?.data?.name,
    dict,
    router,
    workspaceSlug,
    connectionQuery.data?.data?.id,
  ]);

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);

  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('connection', 'read', connectionQuery.data?.data?.id),
    [isResourceAllowed, connectionQuery.data?.data?.id]
  );

  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('connection', 'update', connectionQuery.data?.data?.id),
    [isResourceAllowed, connectionQuery.data?.data?.id]
  );

  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    connectionQuery.data?.data?.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>(connectionQuery.data?.data?.tags ?? []);

  // Sync selectedTags with connection data changes
  useEffect(() => {
    const tags = connectionQuery.data?.data?.tags ?? [];
    setSelectedTags(tags);
    currentTagsRef.current = tags;
    previousTags.current = ''; // Reset to ensure proper comparison in handleUpdateTags
  }, [connectionQuery.data?.data?.tags]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      const connectionId = connectionQuery.data?.data?.id;
      if (!connectionId) return tags;

      try {
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        // Use ref to get the most current tags state, handling rapid changes correctly
        // This ensures each operation builds on the previous optimistic update
        const currentTags = currentTagsRef.current;
        setSelectedTags(tags);
        currentTagsRef.current = tags;
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

        await Promise.all([
          ...tagsToAdd.map((tag) =>
            addTagToEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'connections',
              entityId: connectionId,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'connections',
              entityId: connectionId,
            })
          ),
        ]);

        // Invalidate connection query to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: connectionQueryKey(workspaceSlug, connectionId),
        });

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        // Revert to the last known good state on error
        const fallbackTags = connectionQuery.data?.data?.tags ?? [];
        setSelectedTags(fallbackTags);
        currentTagsRef.current = fallbackTags;
        previousTags.current = JSON.stringify(fallbackTags);
        return fallbackTags;
      } finally {
        setUpdatingTags(false);
      }
    },
    [
      addTagToEntityMutation,
      removeTagFromEntityMutation,
      connectionQuery.data?.data?.id,
      connectionQuery.data?.data?.tags,
      queryClient,
      workspaceSlug,
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
      label: dict.common.owner,
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
        disabled={!isResourceAllowed('connection', 'update', connection.id)}
        deleteButtonDisabled={
          !isResourceAllowed('connection', 'delete', connection.id)
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
                  workspaceSlug={workspaceSlug}
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
