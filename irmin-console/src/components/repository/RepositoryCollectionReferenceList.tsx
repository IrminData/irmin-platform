'use client';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

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
const RepositoryCollectionReferenceList = () => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { repositories: repos } = useWorkspace();

  /**
   * When a repository collection is selected, format the collection name
   * and insert it into the query.
   */
  const selectCollection = (repo: Repository, collection: string) => {
    // Format the collection name
    const formattedName = ` $[${collection}]`;
    // Show the collection name to the user
    irminAlert(
      'info',
      <div>
        <p className='m-0 text-sm font-normal'>
          {dict.repository.referenceRepository.toReferenceTheCollection}{' '}
          <span className='font-medium text-irmin_blue dark:text-irmin_green'>
            {collection}
          </span>{' '}
          {dict.repository.referenceRepository.fromTheRepository}{' '}
          <span className='font-medium text-irmin_blue dark:text-irmin_green'>
            {repo.name}
          </span>{' '}
          {dict.repository.referenceRepository.inTheEditor}{' '}
        </p>
        <p className='mt-4 text-lg font-normal text-black dark:text-white'>
          {formattedName}
        </p>
      </div>
    );
  };

  return (
    <div
      id='repository-collection-reference-list'
      className='flex-grow overflow-auto border-t p-2 text-irmin_black dark:border-gray-800 dark:text-gray-300'
    >
      <p className='px-4 pb-2 text-sm'>
        {dict.consoleNavigation.links.repositories}
      </p>
      <p className='px-4 text-xs text-gray-400'>
        {dict.repository.referenceRepository.clickOnCollection}
      </p>
      <ul className='text-xs'>
        {repos.repositories.map(
          (repo) =>
            repo.collections.length > 0 && (
              <li key={`repo-${repo.id}`} className='px-4 py-2'>
                <p className='border-t pt-2 font-normal dark:border-gray-800'>
                  {repo.name}
                </p>
                <ul className='list-item font-normal'>
                  {repo.collections.map((item, i) => (
                    <li
                      key={`repo-${repo.id}-item-${i}`}
                      className='cursor-pointer pl-4 pr-2 pt-3 opacity-80 transition-colors hover:text-irmin_green hover:opacity-100'
                      onClick={() =>
                        selectCollection(repo, item.formatted_name)
                      }
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              </li>
            )
        )}
      </ul>
    </div>
  );
};

export default RepositoryCollectionReferenceList;
