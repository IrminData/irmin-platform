'use client';

import { useCallback, useRef } from 'react';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';
import { useWorkspace } from '@/context/workspace';

import ImmutableWarning from './ImmutableWarning';

/**
 * Repository Settings section component
 *
 * Handles repository settings updates, reassignment, and deletion.
 * Uses {@link SettingsForm} to show and edit the repository settings.
 */
const RepositorySettingsSection = () => {
  const { dict } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const { currentRepository } = useRepository();
  const {
    workspaces: { currentWorkspace },
    repositories: { updateRepository, reassignRepository, deleteRepository },
  } = useWorkspace();

  const updating = useRef(false);

  /**
   * Updates the repository with the new details provided
   */
  const handleUpdateRepository = useCallback(
    async (data: { name: string; description: string; owner: string }) => {
      if (updating.current) return;
      try {
        updating.current = true;
        // Check if the owner has changed
        if (data.owner && data.owner !== currentRepository.owner.id) {
          // Find the new owner object
          const newOwner = currentWorkspace?.users?.find(
            (user) => user.id === data.owner
          );
          if (newOwner) {
            // Change the owner if it's different and found
            const res = await reassignRepository(currentRepository, newOwner);
            irminAlert(
              'success',
              res.message ?? 'Repository reassigned successfully'
            );
          }
        }

        // Update repository details
        const res = await updateRepository(currentRepository.slug, {
          ...currentRepository,
          name: data.name.trim(),
          description: data.description.trim(),
        });

        irminAlert('success', res.message ?? 'Repository updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            'An error occurred while updating the repository'
        );
      } finally {
        updating.current = false;
      }
    },
    [
      currentRepository,
      updateRepository,
      reassignRepository,
      irminAlert,
      currentWorkspace,
    ]
  );

  /**
   * Deletes the repository after confirming with the user
   */
  const handleDeleteRepository = useCallback(async () => {
    if (updating.current) return;
    try {
      const confirmed = await irminConfirm(
        'warning',
        dict.repository.settings.areYouSureYouWantToDelete
      );
      if (!confirmed) return;
      const res = await deleteRepository(currentRepository.slug);
      irminAlert('success', res.message ?? 'Repository deleted successfully');
    } catch (error) {
      console.error('Error deleting the repository', error);
      irminAlert(
        'error',
        (error as Error)?.message ??
          'An error occurred while deleting the repository'
      );
    } finally {
      updating.current = false;
    }
  }, [currentRepository, irminConfirm, deleteRepository, irminAlert, dict]);

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

  if (currentRepository?.is_immutable) {
    return <ImmutableWarning />;
  }

  return (
    <div
      className='container relative mx-auto my-8 max-w-6xl'
      id='repository-settings-section'
    >
      <SettingsForm
        initialValues={{
          name: currentRepository?.name ?? '',
          description: currentRepository?.description ?? '',
          owner: currentRepository?.owner.id ?? '',
        }}
        onSubmit={handleUpdateRepository}
        fieldConfiguration={fieldConfiguration}
        deleteItem={handleDeleteRepository}
        itemName='Repository'
        submitButtonLabel={dict.repository.settings.saveChanges}
        deleteButtonLabel={dict.repository.settings.deleteRepository}
        dangerZoneMessage={dict.repository.settings.deletionNote}
      />
    </div>
  );
};

export default RepositorySettingsSection;
