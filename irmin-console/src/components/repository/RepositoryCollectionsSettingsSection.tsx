'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import ReactSelect from 'react-select';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

/**
 * Section UI for selecting collections which should be part of this repository
 *
 * @param repository - The repository to display and edit the settings for
 */
export default function RepositoryCollectionsSettingsSection({
  repository,
}: {
  repository: Repository | undefined;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert } = usePopup();
  const {
    workspaces: { currentWorkspace },
    repositories: { repositories, updateRepository },
  } = useWorkspace();

  const [newCollection, setNewCollection] = useState<string | null>(null);
  const [collections, setCollections] = useState<string[]>(
    repository?.collections ?? []
  );

  useEffect(() => {
    if (collections.length === 0) setCollections(repository?.collections ?? []);
  }, [repository, collections.length]);

  /**
   * Calculates all available collections for the repository collection settings section.
   *
   * @returns An array of unique collections that are not included in the current repository's collections.
   */
  const allAvailableCollections = useMemo(
    () =>
      Array.from(
        new Set(
          repositories
            .map((repo) => repo.collections)
            .flat()
            .filter((item) => collections.includes(item))
        )
      ),
    [repositories, collections]
  );

  /**
   * Updates the repository with the new collections provided
   * Uses {@link updateRepository} to update the repository details
   * Shows {@link irminAlert} on success or error
   */
  const handleUpdateRepository = useCallback(async () => {
    try {
      if (!repository) return;
      // Remove duplicate collections
      const uniqueCollections = Array.from(new Set(collections));
      if (uniqueCollections.length !== collections.length) {
        setCollections(uniqueCollections);
      }
      // Update repository collections
      await updateRepository(repository.slug, {
        ...repository,
        collections: uniqueCollections,
      });
      irminAlert('success', dict.repository.settings.repositoryUpdated);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  }, [repository, updateRepository, collections, irminAlert, dict]);

  return (
    <div className='container relative mx-auto my-8 max-w-6xl'>
      <div className='w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
        <div className='my-8 px-4'>
          <div className='mb-8 flex flex-row items-center justify-between px-2'>
            <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
              {dict.repository.settings.manageCollections}
            </h2>
            <Button
              size='sm'
              variant='link'
              colorScheme='gray'
              href={`/${locale}/portal/${currentWorkspace?.slug ?? ''}/repositories/${repository?.slug ?? ''}/settings`}
            >
              {dict.repository.settings.generalSettings}
            </Button>
          </div>
          {repository?.is_immutable && (
            <p className='text-sm font-normal text-red-800 md:text-xl dark:text-red-400'>
              {dict.repository.immutableDescription}
            </p>
          )}
          {repository && !repository?.is_immutable && (
            <div className='flex flex-col'>
              <span className='pb-2 text-xs text-gray-600 dark:text-gray-400'>
                {dict.repository.settings.selectCollectionToAdd}
              </span>
              <div className='flex w-full flex-row items-center justify-normal gap-2'>
                {/* Form to add more collections to this repository */}
                <div className='w-full'>
                  <ReactSelect
                    value={{ value: newCollection, label: newCollection }}
                    onChange={(newValue) => {
                      if (!newValue) return;
                      setNewCollection(newValue.value);
                    }}
                    options={allAvailableCollections.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    className='react-select-container w-full'
                    classNamePrefix='react-select'
                  />
                </div>
                <Button
                  className='min-w-24'
                  size='sm'
                  colorScheme='secondary'
                  variant='solid'
                  onClick={() => {
                    if (newCollection)
                      setCollections([...collections, newCollection]);
                  }}
                >
                  {dict.repository.settings.add}
                </Button>
              </div>
              <div className='my-8'>
                {/* List of current collections in the repository */}
                {collections.map((item, idx) => (
                  <div
                    key={`collection-${item}-${idx}`}
                    className='flex w-full flex-row items-center justify-between'
                  >
                    <div className='text-xs opacity-80'>{item}</div>
                    <Button
                      size='sm'
                      colorScheme='gray'
                      variant='link'
                      onClick={() => {
                        setCollections(collections.filter((t) => t !== item));
                      }}
                    >
                      {dict.repository.settings.remove}
                    </Button>
                  </div>
                ))}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
