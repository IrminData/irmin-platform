'use client';

import { useCallback, useState } from 'react';

import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/core/Repository';

/**
 * Section UI for the Repository settings
 *
 * @param repository - The repository to display and edit the settings for
 */
export default function RepositorySettingsSection({
  repository,
}: {
  repository: Repository | undefined;
}) {
  const { dict, locale } = useLocale();
  const { irminConfirm, irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    repositories: { updateRepository, deleteRepository, reassignRepository },
  } = useWorkspace();

  const [nameField, setNameField] = useState(repository?.name ?? '');
  const [descriptionField, setDescriptionField] = useState(
    repository?.description ?? ''
  );
  const [ownerField, setOwnerField] = useState(repository?.owner ?? null);

  /**
   * Updates the repository with the new details provided
   * Uses {@link updateRepository} to update the repository details
   * Uses {@link reassignRepository} to change the owner of the repository
   * Shows {@link irminAlert} on success or error
   */
  const handleUpdateRepository = useCallback(async () => {
    try {
      if (!repository) return;
      if (ownerField && ownerField?.id !== repository.owner.id) {
        // Change the owner of the repository if it's different
        await reassignRepository(repository, ownerField);
        irminAlert('success', dict.repository.settings.repositoryOwnerChanged);
      }
      // Update other repository details
      const name = nameField.trim();
      const description = descriptionField.trim();
      await updateRepository(repository.slug, {
        ...repository,
        name,
        description,
      });
      irminAlert('success', dict.repository.settings.repositoryUpdated);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  }, [
    repository,
    updateRepository,
    reassignRepository,
    nameField,
    descriptionField,
    ownerField,
    irminAlert,
    dict,
  ]);

  /**
   * Deletes the repository after confirming with the user
   * Uses {@link deleteRepository} to delete the repository
   * Shows {@link irminAlert} on success or error
   */
  const handleDeleteRepository = useCallback(() => {
    try {
      if (!repository) return;
      irminConfirm(
        'warning',
        dict.repository.settings.areYouSureYouWantToDelete,
        (confirmed) => {
          if (confirmed) {
            deleteRepository(repository.slug);
            irminAlert('success', dict.repository.settings.repositoryUpdated);
          }
        }
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  }, [repository, irminConfirm, deleteRepository, irminAlert, dict]);

  return (
    <div className='container relative mx-auto my-8 max-w-6xl'>
      <div className='w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
        <div className='my-8 px-4'>
          <div className='mb-8 flex flex-row items-center justify-between px-2'>
            <h2 className='font-display text-3xl font-bold text-opacity-80 sm:text-4xl lg:text-5xl'>
              {dict.repository.tabs.settings}
            </h2>
            <Button
              size='sm'
              variant='link'
              colorScheme='gray'
              href={`/${locale}/console/${currentWorkspace?.slug ?? ''}/repositories/${repository?.slug ?? ''}/settings/collections`}
            >
              {dict.repository.settings.manageCollections}
            </Button>
          </div>
          {repository?.is_immutable && (
            <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
              {dict.repository.immutableDescription}
            </p>
          )}
          {repository && !repository?.is_immutable && (
            <div className='flex flex-col gap-4'>
              <div>
                <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                  {dict.repository.settings.name}
                </label>
                <Input
                  size='sm'
                  variant='outline'
                  colorScheme='gray'
                  required
                  className='h-11 w-full'
                  type='text'
                  name='name'
                  defaultValue={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                />
              </div>
              <div>
                <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                  {dict.repository.settings.description}
                </label>
                <Input
                  size='sm'
                  variant='outline'
                  colorScheme='gray'
                  required
                  className='w-full'
                  type='text'
                  name='description'
                  defaultValue={descriptionField}
                  onChange={(e) => setDescriptionField(e.target.value)}
                  longtext={{
                    rows: 3,
                  }}
                />
              </div>
              <div>
                <label className='mb-2 block text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
                  {dict.repository.settings.owner}
                </label>
                <ReactSelect
                  value={ownerField}
                  onChange={(newValue) => {
                    if (!newValue) return;
                    setOwnerField(newValue);
                  }}
                  options={currentWorkspace?.users ?? []}
                  getOptionLabel={(option) => option.email}
                  className='react-select-container'
                  classNamePrefix='react-select'
                />
              </div>
              <Button
                className='h-11 w-full'
                type='submit'
                size='sm'
                colorScheme='primary'
                variant='solid'
                onClick={handleUpdateRepository}
              >
                {dict.repository.settings.saveChanges}
              </Button>
              <div className='mt-8'>
                <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
                  {dict.repository.settings.dangerZone}
                </p>
                <p className='mt-2 text-xs text-gray-700 md:text-base dark:text-gray-200'>
                  {dict.repository.settings.deletionNote}
                </p>
                <Button
                  className='mt-4 dark:bg-gray-800 dark:text-white'
                  size='sm'
                  colorScheme='secondary'
                  variant='outline'
                  onClick={handleDeleteRepository}
                >
                  {dict.repository.settings.deleteRepository}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
