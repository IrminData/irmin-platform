'use client';

import React, { useCallback } from 'react';

import SettingsForm, {
  FieldConfig,
} from '@/components/common/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/core/Repository';

/**
 * Repository Settings section component
 *
 * Handles repository settings updates, reassignment, and deletion.
 * Uses {@link SettingsForm} to show and edit the repository settings.
 *
 * @param props - The props
 * @param props.repository - The repository to view and edit settings for
 */
const RepositorySettingsSection = ({
  repository,
}: {
  repository: Repository | undefined;
}) => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    repositories: { updateRepository, reassignRepository, deleteRepository },
  } = useWorkspace();

  /**
   * Updates the repository with the new details provided
   */
  const handleUpdateRepository = useCallback(
    async (data: { name: string; description: string; owner: string }) => {
      try {
        if (!repository) return;

        // Check if the owner has changed
        if (data.owner && data.owner !== repository.owner.id) {
          // Find the new owner object
          const newOwner = currentWorkspace?.users?.find(
            (user) => user.id === data.owner
          );
          if (newOwner) {
            // Change the owner if it's different and found
            const res = await reassignRepository(repository, newOwner);
            irminAlert(
              'success',
              res.message ?? dict.repository.settings.repositoryOwnerChanged
            );
          }
        }

        // Update repository details
        const res = await updateRepository(repository.slug, {
          ...repository,
          name: data.name.trim(),
          description: data.description.trim(),
        });

        irminAlert(
          'success',
          res.message ?? dict.repository.settings.repositoryUpdated
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            dict.repository.settings.errorUpdatingRepository
        );
      }
    },
    [
      repository,
      updateRepository,
      reassignRepository,
      irminAlert,
      dict,
      currentWorkspace,
    ]
  );

  /**
   * Deletes the repository after confirming with the user
   */
  const handleDeleteRepository = useCallback(() => {
    try {
      if (!repository) return;
      irminConfirm(
        'warning',
        dict.repository.settings.areYouSureYouWantToDelete,
        async (confirmed) => {
          if (!confirmed) return;
          const res = await deleteRepository(repository.slug);
          irminAlert(
            'success',
            res.message ?? dict.repository.settings.repositoryDeleted
          );
        }
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorDeletingRepository
      );
    }
  }, [repository, irminConfirm, deleteRepository, irminAlert, dict]);

  // Define field configurations
  const fieldConfiguration: FieldConfig<{
    name: string;
    description: string;
    owner: string;
  }>[] = [
    {
      name: 'name',
      label: dict.repository.settings.name,
      type: 'text',
      placeholder: '',
    },
    {
      name: 'description',
      label: dict.repository.settings.description,
      type: 'textarea',
      placeholder: '',
    },
    {
      name: 'owner',
      label: dict.repository.settings.owner,
      type: 'select',
      options:
        currentWorkspace?.users?.map((user) => ({
          value: user.id,
          label: user.email,
        })) ?? [],
    },
  ];

  return (
    <div
      className='container relative mx-auto my-8 max-w-6xl'
      id='repository-settings-section'
    >
      {repository?.is_immutable ? (
        <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
          {dict.repository.immutableDescription}
        </p>
      ) : (
        <SettingsForm
          initialValues={{
            name: repository?.name ?? '',
            description: repository?.description ?? '',
            owner: repository?.owner.id ?? '',
          }}
          onSubmit={handleUpdateRepository}
          fieldConfiguration={fieldConfiguration}
          deleteItem={handleDeleteRepository}
          itemName='Repository'
          submitButtonLabel={dict.repository.settings.saveChanges}
          deleteButtonLabel={dict.repository.settings.deleteRepository}
          dangerZoneMessage={dict.repository.settings.deletionNote}
        />
      )}
    </div>
  );
};

export default RepositorySettingsSection;
