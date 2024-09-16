'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import ReactSelect from 'react-select';

import { IoChevronBack } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import Input from '@/components/common/form/Input';
import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

/**
 * Section to create a new repository.
 */
export default function RepositoryCreateSection() {
  const router = useRouter();
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const [nameField, setNameField] = useState('');
  const [descriptionField, setDescriptionField] = useState('');

  const {
    repositories: { repositories, createRepository },
  } = useWorkspace();

  const [newCollection, setNewCollection] = useState<string | null>(null);
  const [collections, setCollections] = useState<string[]>([]);

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
            .filter((collection) => !collections.includes(collection))
        )
      ),
    [repositories, collections]
  );

  /**
   * Creates a new repository with the details provided
   * Uses {@link createNewRepository} to create the repository
   * Shows {@link irminAlert} on success or error
   */
  const handleCreateRepository = useCallback(async () => {
    try {
      const name = nameField.trim();
      const description = descriptionField.trim();
      // Remove duplicate collections
      const uniqueCollections = Array.from(new Set(collections));
      if (uniqueCollections.length !== collections.length) {
        setCollections(uniqueCollections);
      }
      // Check if all required fields are filled
      if (
        name &&
        description &&
        uniqueCollections &&
        name.length > 0 &&
        uniqueCollections.length > 0
      ) {
        await createRepository({
          name: name,
          description: description,
          collections: collections,
          documentation: '',
        } as Repository);
        irminAlert('success', dict.repository.repositoryCreated);
        router.push('../repositories');
      }
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.repository.settings.errorUpdatingRepository
      );
    }
  }, [
    nameField,
    descriptionField,
    collections,
    irminAlert,
    createRepository,
    router,
    dict,
  ]);

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <div className='mt-8 w-full max-w-3xl rounded-lg border-b border-t border-irmin_green bg-white px-4 py-4 shadow-md md:mx-4 dark:bg-irmin_black-600'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-row items-center gap-2'>
            <Button
              size='sm'
              variant='icon'
              colorScheme='black'
              className='aspect-square h-auto w-auto rounded-full bg-gray-100 dark:bg-gray-700'
              href={`../repositories`}
            >
              <IoChevronBack size={24} />
            </Button>
            <PortalTitle title={dict.repository.createNewRepository} />
          </div>
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
              name='name'
              defaultValue={descriptionField}
              onChange={(e) => setDescriptionField(e.target.value)}
              longtext={{
                rows: 3,
              }}
            />
          </div>
          <span className='-mb-2 px-2 text-xs text-gray-600 md:text-sm lg:text-base dark:text-gray-400'>
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
                options={allAvailableCollections.map((collection) => ({
                  value: collection,
                  label: collection,
                }))}
                className='react-select-container w-full'
                classNamePrefix='react-select'
              />
            </div>
            <Button
              className='min-w-24'
              size='sm'
              colorScheme='gray'
              variant='solid'
              onClick={() => {
                if (newCollection)
                  setCollections([...collections, newCollection]);
              }}
            >
              {dict.repository.settings.addCollection}
            </Button>
          </div>
          <div>
            {/* List of current collections in the repository */}
            {collections.map((collection, idx) => (
              <div
                key={`collection-${collection}-${idx}`}
                className='mx-2 flex w-full flex-row items-center justify-between'
              >
                <div className='text-xs opacity-80'>{collection}</div>
                <Button
                  size='sm'
                  colorScheme='gray'
                  variant='link'
                  onClick={() => {
                    setCollections(collections.filter((t) => t !== collection));
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
            onClick={handleCreateRepository}
          >
            {dict.repository.createNewRepository}
          </Button>
        </div>
      </div>
    </div>
  );
}
