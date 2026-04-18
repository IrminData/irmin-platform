'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { workflowQueryKey } from '@/lib/queryKeys';

import type { FieldConfig } from '@/components/ui/form/SettingsForm';
import SettingsForm from '@/components/ui/form/SettingsForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useUsers, useWorkflow, useWorkspaceTags } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Tag } from '@/types/core/Tag';

interface WorkflowFormValues {
  name: string;
  description: string;
  cron_syntax: string;
  owner: string;
}

/**
 * Workflow Settings section component
 *
 * Handles workflow settings updates, transferment, deletion, and pausing/resuming.
 * Uses {@link SettingsForm} to show and edit the workflow settings.
 */
const WorkflowSettingsSection = ({ workflowID }: { workflowID: string }) => {
  const { dict } = useLocale();
  const { irminConfirm } = usePopup();
  const { usersQuery } = useUsers();
  const {
    workflowQuery,
    updateWorkflowMutation,
    transferWorkflowMutation,
    deleteWorkflowMutation,
  } = useWorkflow(workflowID);
  const router = useRouter();
  const { workspaceSlug } = useWorkspaceContext();
  const { isResourceAllowed } = useResourceAllowed();
  const queryClient = useQueryClient();

  const [submitting, setSubmitting] = useState(false);

  const handleUpdateWorkflow = useCallback(
    async (data: WorkflowFormValues) => {
      try {
        setSubmitting(true);
        if (data.owner !== workflowQuery.data?.data?.owner.id) {
          const confirmed = await irminConfirm(
            'warning',
            `${dict.common.areYouSureYouWantToTransferOwnership} (${workflowQuery.data?.data?.name})`
          );
          if (confirmed) {
            await transferWorkflowMutation.mutateAsync(data.owner);
          }
        }
        await updateWorkflowMutation.mutateAsync({
          name: data.name,
          description: data.description,
          documentation: workflowQuery.data?.data?.documentation ?? '',
        });
      } catch (error) {
        console.error('Error updating workflow:', error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      workflowQuery,
      updateWorkflowMutation,
      transferWorkflowMutation,
      irminConfirm,
      dict,
    ]
  );

  const handleDeleteWorkflow = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${workflowQuery.data?.data?.name})`
    );
    if (!confirmed) return;
    await deleteWorkflowMutation.mutateAsync(workflowID);
    router.push(`/workspace/${workspaceSlug}/workflows`);
  }, [
    deleteWorkflowMutation,
    irminConfirm,
    workflowQuery.data?.data?.name,
    dict,
    router,
    workspaceSlug,
    workflowID,
  ]);

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);

  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('workflow', 'read', workflowQuery.data?.data?.id),
    [isResourceAllowed, workflowQuery.data?.data?.id]
  );

  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('workflow', 'update', workflowQuery.data?.data?.id),
    [isResourceAllowed, workflowQuery.data?.data?.id]
  );

  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    workflowQuery.data?.data?.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>(workflowQuery.data?.data?.tags ?? []);

  // Sync selectedTags with workflow data changes
  useEffect(() => {
    const tags = workflowQuery.data?.data?.tags ?? [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form draft state from canonical prop; ref tracking must stay coupled
    setSelectedTags(tags);
    currentTagsRef.current = tags;
    previousTags.current = ''; // Reset to ensure proper comparison in handleUpdateTags
  }, [workflowQuery.data?.data?.tags]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      try {
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        const workflowId = workflowQuery.data?.data?.id;
        if (!workflowId) return tags;

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
              entityType: 'workflows',
              entityId: workflowId,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'workflows',
              entityId: workflowId,
            })
          ),
        ]);

        // Invalidate workflow query to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: workflowQueryKey(workspaceSlug, workflowId),
        });

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        // Revert to the last known good state on error
        const fallbackTags = workflowQuery.data?.data?.tags ?? [];
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
      workflowQuery.data,
      queryClient,
      workspaceSlug,
    ]
  );

  // Define field configurations
  const fieldConfiguration: FieldConfig<WorkflowFormValues>[] = [
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

  if (workflowQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (workflowQuery.isError) {
    return (
      <div>
        {dict.common.error}: {workflowQuery.error.message}
      </div>
    );
  }

  if (!workflowQuery.data?.data) {
    return <></>;
  }

  const workflow = workflowQuery.data.data;

  return (
    <div id='workflow-settings-section'>
      <SettingsForm<WorkflowFormValues>
        initialValues={{
          name: workflow.name,
          description: workflow.description,
          owner: workflow.owner.id,
        }}
        onSubmit={handleUpdateWorkflow}
        submitting={
          submitting ||
          deleteWorkflowMutation.isPending ||
          updateWorkflowMutation.isPending ||
          transferWorkflowMutation.isPending
        }
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteWorkflow}
        deleteItemLoading={deleteWorkflowMutation.isPending}
        itemName='Workflow'
        submitButtonLabel={dict.workflow.settings.saveChanges}
        deleteButtonLabel={dict.workflow.settings.delete}
        dangerZoneMessage={dict.workflow.settings.deletionNote}
        disabled={!isResourceAllowed('workflow', 'update', workflow.id)}
        deleteButtonDisabled={
          !isResourceAllowed('workflow', 'delete', workflow.id)
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

export default WorkflowSettingsSection;
