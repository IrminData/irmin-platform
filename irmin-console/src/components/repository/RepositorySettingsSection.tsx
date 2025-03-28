'use client';

import { useCallback } from 'react';

import { Dictionary } from '@/lib/dict';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useRepository } from '@/context/RepositoryContext';

import { Workspace } from '@/types/core/Workspace';

import ImmutableWarning from './ImmutableWarning';

/**
 * Repository Settings section component
 *
 * Handles repository settings updates, transferment, and deletion.
 * Uses {@link SettingsForm} to show and edit the repository settings.
 */
const RepositorySettingsSection = ({
  currentWorkspace,
  dict,
}: {
  currentWorkspace: Workspace;
  dict: Dictionary;
}) => {
  const {
    currentRepository,
    transferRepository,
    updateRepository,
    deleteRepository,
  } = useRepository();

  const handleUpdateRepository = useCallback(
    async (data: { name: string; description: string; owner: string }) => {
      if (data.owner !== currentRepository.owner.id) {
        await transferRepository(data.owner);
      }
      await updateRepository({
        name: data.name,
        description: data.description,
      });
    },
    [currentRepository, updateRepository, transferRepository]
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
      label: dict.list.owner,
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
      className='relative container mx-auto my-8 max-w-7xl'
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
        deleteItem={deleteRepository}
        itemName='Repository'
        submitButtonLabel={dict.common.save}
        deleteButtonLabel={dict.repository.settings.deleteRepository}
        dangerZoneMessage={dict.repository.settings.deletionNote}
      />
    </div>
  );
};

export default RepositorySettingsSection;
