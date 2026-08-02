'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { aiApplicationQueryKey } from '@/lib/queryKeys';

import SafeComponent from '@/components/ui/error/SafeComponent';
import type { FieldConfig } from '@/components/ui/form/SettingsForm';
import SettingsForm from '@/components/ui/form/SettingsForm';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useWorkspaceTags } from '@/hooks/api/useWorkspaceTags';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

/**
 * AI Application Settings section component
 *
 * Handles AI Application settings updates, ownership transfer, and deletion.
 * Uses {@link SettingsForm} to show and edit the AI Application settings.
 *
 * @returns The AI Application settings section component
 */
const AIApplicationSettingsSection = () => {
  return (
    <SafeComponent
      level='section'
      titleKey='appSettingsTitle'
      descriptionKey='appSettingsDescription'
    >
      <AIApplicationSettingsSectionContent />
    </SafeComponent>
  );
};

const AIApplicationSettingsSectionContent = () => {
  const { dict } = useLocale();
  const { irminConfirm } = usePopup();
  const { workspaceQuery, workspaceSlug } = useWorkspaceContext();
  const { aiApplication } = useAIApplicationContext();
  const router = useRouter();
  const {
    deleteAIApplicationMutation,
    transferOwnershipMutation,
    updateAIApplicationMutation,
  } = useAIApplication(aiApplication.id);
  const { isResourceAllowed } = useResourceAllowed();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const handleUpdateAIApplication = useCallback(
    async (data: { name: string; description: string; owner: string }) => {
      try {
        setSubmitting(true);
        if (data.owner !== aiApplication.owner.id) {
          const confirmed = await irminConfirm(
            'warning',
            `${dict.common.areYouSureYouWantToTransferOwnership} (${aiApplication.name})`
          );
          if (confirmed) {
            await transferOwnershipMutation.mutateAsync({
              newOwnerId: data.owner,
            });
          } else {
            // User cancelled ownership transfer, abort the entire operation
            return;
          }
        }
        await updateAIApplicationMutation.mutateAsync({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        console.error('Error updating AI Application:', error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      aiApplication,
      updateAIApplicationMutation,
      transferOwnershipMutation,
      irminConfirm,
      dict,
    ]
  );

  const handleDeleteAIApplication = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${aiApplication.name})`
    );
    if (!confirmed) return;
    await deleteAIApplicationMutation.mutateAsync();
    router.push(`${workspaceUrl}/ai-applications`);
  }, [
    aiApplication,
    deleteAIApplicationMutation,
    irminConfirm,
    dict,
    router,
    workspaceUrl,
  ]);

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);

  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('ai_application', 'read', aiApplication.id),
    [isResourceAllowed, aiApplication.id]
  );
  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('ai_application', 'update', aiApplication.id),
    [isResourceAllowed, aiApplication.id]
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    aiApplication.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>(aiApplication.tags ?? []);

  // Reset selectedTags when server tags change.
  const [prevAppTags, setPrevAppTags] = useState(aiApplication.tags);
  if (aiApplication.tags !== prevAppTags) {
    setPrevAppTags(aiApplication.tags);
    setSelectedTags(aiApplication.tags ?? []);
  }

  // Sync diff-tracking refs (can't mutate refs during render).
  useEffect(() => {
    const tags = aiApplication.tags ?? [];
    currentTagsRef.current = tags;
    previousTags.current = '';
  }, [aiApplication.tags]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      try {
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

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
              entityType: 'ai_applications',
              entityId: aiApplication.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'ai_applications',
              entityId: aiApplication.id,
            })
          ),
        ]);

        // Invalidate AI Application query to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: aiApplicationQueryKey(workspaceSlug, aiApplication.id),
        });

        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        // Invalidate query to fetch current server state since Promise.all may have
        // partially completed before failure
        await queryClient.invalidateQueries({
          queryKey: aiApplicationQueryKey(workspaceSlug, aiApplication.id),
        });
        const fallbackTags = aiApplication.tags ?? [];
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
      aiApplication.id,
      aiApplication.tags,
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

  return (
    <div
      className='relative container mx-auto my-8 max-w-7xl'
      id='ai-application-settings-section'
    >
      <SettingsForm
        initialValues={{
          name: aiApplication?.name ?? '',
          description: aiApplication?.description ?? '',
          owner: aiApplication?.owner.id ?? '',
        }}
        onSubmit={handleUpdateAIApplication}
        submitting={submitting}
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteAIApplication}
        deleteItemLoading={deleteAIApplicationMutation.isPending}
        itemName={dict.aiApplication.aiApplication}
        submitButtonLabel={dict.common.save}
        deleteButtonLabel={dict.aiApplication.deleteAIApplication}
        dangerZoneMessage={dict.aiApplication.deleteWarning}
        disabled={
          !isResourceAllowed('ai_application', 'update', aiApplication.id)
        }
        deleteButtonDisabled={
          !isResourceAllowed('ai_application', 'delete', aiApplication.id)
        }
        additionalContentRight={
          canViewTags && (
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
          )
        }
      />
    </div>
  );
};

export default AIApplicationSettingsSection;
