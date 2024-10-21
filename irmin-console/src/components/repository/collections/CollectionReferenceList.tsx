'use client';

import { useEffect, useState } from 'react';

import { getCollections } from '@/lib/actions/collections';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Collection } from '@/types/core/Collection';
import { Repository } from '@/types/core/Repository';

/**
 * Component to display a list of repositories and their collections.
 *
 * Used in the sidebar of the query tool and editor.
 *
 * When a collection is selected, a reference snippet is generated and
 * displayed to the user.
 *
 * @returns The repository collection reference list component
 */
const CollectionReferenceList = ({
  repositories,
}: {
  repositories: Repository[];
}) => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();

  const [collections, setCollections] = useState<Collection[]>([]);
  useEffect(() => {
    getCollections()
      .then((res) => setCollections(res))
      .catch((error) =>
        console.error((error as Error).message, 'Fetch collections error')
      );
  }, []);

  /**
   * When a repository collection is selected, format the collection name
   * and insert it into the query.
   *
   * @param repository - The repository to reference
   * @param collection - The collection to reference
   */
  const selectCollection = (repository: Repository, collection: string) => {
    // Format the collection name
    const collectionSnippet = ` $["${repository.slug}.${collection}"]`;
    const collectionSnippetWithRef = ` $["${repository.slug}.${collection}@main"]`;
    // Show the collection name to the user
    irminAlert(
      'info',
      <div className='text-foreground'>
        <p className='m-0 text-sm font-normal opacity-70'>
          {dict.repository.referenceRepository.toReferenceTheCollection}{' '}
          <span className='font-medium text-accent'>{collection}</span>{' '}
          {dict.repository.referenceRepository.fromTheRepository}{' '}
          <span className='font-medium text-accent'>{repository.name}</span>{' '}
          {dict.repository.referenceRepository.inTheEditor}{' '}
        </p>
        <p className='my-2 pl-4 text-lg font-normal'>{collectionSnippet}</p>
        <p className='m-0 text-sm font-normal opacity-70'>
          {dict.repository.referenceRepository.orForSpecificRef}
        </p>
        <p className='my-2 pl-4 text-lg font-normal'>
          {collectionSnippetWithRef}
        </p>
      </div>
    );
  };

  return (
    <div
      id='repository-collection-reference-list'
      className='flex-grow overflow-auto border-t p-2 text-foreground dark:border-gray-800 dark:text-gray-300'
    >
      <p className='px-4 pb-2 text-sm'>
        {dict.consoleNavigation.links.repositories}
      </p>
      <p className='px-4 text-xs text-gray-400'>
        {dict.repository.referenceRepository.clickOnCollection}
      </p>
      <ul className='text-xs'>
        {repositories.map((repository) => {
          const matchedCollections = collections.filter(
            (item) => item.repository === repository.slug
          );
          if (matchedCollections.length === 0) return;
          return (
            <li key={`repository-${repository.id}`} className='px-4 py-2'>
              <p className='border-t pt-2 font-normal dark:border-gray-800'>
                {repository.name}
              </p>
              <ul className='list-item font-normal'>
                {matchedCollections.map((item, i) => (
                  <li
                    key={`repository-${repository.id}-item-${i}`}
                    className='cursor-pointer pl-4 pr-2 pt-3 opacity-80 transition-colors hover:text-irmin_green hover:opacity-100'
                    onClick={() => selectCollection(repository, item.name)}
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CollectionReferenceList;
