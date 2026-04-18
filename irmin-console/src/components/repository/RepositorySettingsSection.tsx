'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { repositoryQueryKey } from '@/lib/queryKeys';

import SafeComponent from '@/components/ui/error/SafeComponent';
import type { FieldConfig } from '@/components/ui/form/SettingsForm';
import SettingsForm from '@/components/ui/form/SettingsForm';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useRepository, useWorkspaceTags } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

import ImmutableWarning from './ImmutableWarning';

/**
 * Repository Settings section component
 *
 * Handles repository settings updates, transferment, and deletion.
 * Uses {@link SettingsForm} to show and edit the repository settings.
 *
 * @returns The repository settings section component
 */
const RepositorySettingsSection = () => {
  return (
    <SafeComponent
      level='section'
      title='Repository Settings Error'
      description='The repository settings section encountered an error. Please try refreshing the page.'
    >
      <RepositorySettingsSectionContent />
    </SafeComponent>
  );
};

const RepositorySettingsSectionContent = () => {
  const { dict } = useLocale();
  const { irminConfirm } = usePopup();
  const { workspaceQuery, workspaceSlug } = useWorkspaceContext();
  const { repository } = useRepositoryContext();
  const router = useRouter();
  const {
    deleteRepositoryMutation,
    transferRepositoryMutation,
    updateRepositoryMutation,
  } = useRepository(repository.slug);
  const { isResourceAllowed } = useResourceAllowed();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const handleUpdateRepository = useCallback(
    async (data: { name: string; description: string; owner: string }) => {
      try {
        setSubmitting(true);
        if (data.owner !== repository.owner.id) {
          const confirmed = await irminConfirm(
            'warning',
            `${dict.common.areYouSureYouWantToTransferOwnership} (${repository.name})`
          );
          if (confirmed) {
            await transferRepositoryMutation.mutateAsync(data.owner);
          }
        }
        await updateRepositoryMutation.mutateAsync({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        console.error('Error updating repository:', error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      repository,
      updateRepositoryMutation,
      transferRepositoryMutation,
      irminConfirm,
      dict,
    ]
  );

  const handleDeleteRepository = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${repository.name})`
    );
    if (!confirmed) return;
    await deleteRepositoryMutation.mutateAsync(repository.slug);
    router.push(`/workspace/${workspaceSlug}/repositories`);
  }, [
    repository,
    deleteRepositoryMutation,
    irminConfirm,
    dict,
    router,
    workspaceSlug,
  ]);

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);

  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('repository', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('repository', 'update', repository.id),
    [isResourceAllowed, repository.id]
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    repository.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>(repository.tags ?? []);

  // Sync selectedTags with repository data changes
  useEffect(() => {
    const tags = repository.tags ?? [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form draft state from canonical prop; ref tracking must stay coupled
    setSelectedTags(tags);
    currentTagsRef.current = tags;
    previousTags.current = ''; // Reset to ensure proper comparison in handleUpdateTags
  }, [repository.tags]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
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
              entityType: 'repositories',
              entityId: repository.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'repositories',
              entityId: repository.id,
            })
          ),
        ]);

        // Invalidate repository query to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: repositoryQueryKey(workspaceSlug, repository.slug),
        });

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        // Revert to the last known good state on error
        const fallbackTags = repository.tags ?? [];
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
      repository.id,
      repository.tags,
      repository.slug,
      queryClient,
      workspaceSlug,
    ]
  );

  // Define field configurations
  const fieldConfiguration: FieldConfig<{
    name: string;
    description: string;
    owner: string;
  }>[] = [
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
        workspaceQuery?.data?.data?.users?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  if (repository?.is_immutable) {
    return <ImmutableWarning />;
  }

  return (
    <div
      className='relative container mx-auto my-8 max-w-7xl'
      id='repository-settings-section'
    >
      <SettingsForm
        initialValues={{
          name: repository?.name ?? '',
          description: repository?.description ?? '',
          owner: repository?.owner.id ?? '',
        }}
        onSubmit={handleUpdateRepository}
        submitting={submitting}
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteRepository}
        deleteItemLoading={deleteRepositoryMutation.isPending}
        itemName='Repository'
        submitButtonLabel={dict.common.save}
        deleteButtonLabel={dict.repository.settings.deleteRepository}
        dangerZoneMessage={dict.repository.settings.deletionNote}
        disabled={!isResourceAllowed('repository', 'update', repository.id)}
        deleteButtonDisabled={
          !isResourceAllowed('repository', 'delete', repository.id)
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

export default RepositorySettingsSection;
