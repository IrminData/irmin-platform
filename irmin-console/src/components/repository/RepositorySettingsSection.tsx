'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useRepository } from '@/hooks/useRepository';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

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
    await deleteRepositoryMutation.mutateAsync();
    router.push(`/workspace/${workspaceSlug}/repositories`);
  }, [
    repository,
    deleteRepositoryMutation,
    irminConfirm,
    dict,
    router,
    workspaceSlug,
  ]);

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
      label: dict.list.owner,
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
        disabled={
          !isResourceAllowed(
            PolicyResource.Repository,
            PolicyAction.Update,
            repository.id
          )
        }
        deleteButtonDisabled={
          !isResourceAllowed(
            PolicyResource.Repository,
            PolicyAction.Delete,
            repository.id
          )
        }
      />
    </div>
  );
};

export default RepositorySettingsSection;
