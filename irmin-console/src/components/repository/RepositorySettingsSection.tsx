'use client';

import { useCallback, useState } from 'react';

import SettingsForm, { FieldConfig } from '@/components/ui/form/SettingsForm';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

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
  const { workspaceQuery } = useWorkspaceContext();
  const {
    currentRepository,
    transferRepository,
    updateRepository,
    deleteRepository,
  } = useRepository();

  const [submitting, setSubmitting] = useState(false);
  const handleUpdateRepository = useCallback(
    async (data: { name: string; description: string; owner: string }) => {
      try {
        setSubmitting(true);
        if (data.owner !== currentRepository.owner.id) {
          await transferRepository(data.owner);
        }
        await updateRepository({
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        console.error('Error updating repository:', error);
      } finally {
        setSubmitting(false);
      }
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
        workspaceQuery?.data?.data?.users?.map((user) => ({
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
        submitting={submitting}
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
