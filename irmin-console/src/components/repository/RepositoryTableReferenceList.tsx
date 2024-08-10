'use client';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Repository } from '@/types/api/Repository';

/**
 * Component to display a list of repositories and their tables.
 *
 * Used in the sidebar of the query tool and editor.
 *
 * When a table is selected, a reference snippet is generated and
 * displayed to the user.
 *
 * @returns The repository table reference list component
 */
const RepositoryTableReferenceList = () => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { repositories: repos } = useWorkspace();

  /**
   * When a repository table is selected, format the table name
   * and insert it into the query.
   */
  const selectDBTable = (repo: Repository, table: string) => {
    // Format the table name
    const formattedTable = ` $[${table}]`;
    // Alert the table name to the user
    irminAlert(
      'info',
      <div>
        <p className='m-0 text-xs font-light text-irmin_black'>
          {dict.repository.referenceRepository.toReferenceTheTable}{' '}
          <span className='font-medium text-irmin_blue'>{table}</span>{' '}
          {dict.repository.referenceRepository.fromTheRepository}{' '}
          <span className='font-medium text-irmin_blue'>{repo.name}</span>{' '}
          {dict.repository.referenceRepository.inTheEditor}
        </p>
        <p className='my-2 text-sm font-normal text-irmin_blue'>
          {formattedTable}
        </p>
      </div>
    );
  };

  return (
    <div
      id='repository-table-reference-list'
      className='flex-grow overflow-auto border-t p-2 text-irmin_black'
    >
      <p className='px-4 pb-2 text-sm'>
        {dict.portalNavigation.links.repositories}
      </p>
      <p className='px-4 text-xs text-gray-400'>
        {dict.repository.referenceRepository.clickOnATable}
      </p>
      <ul className='text-xs'>
        {repos.repositories.map(
          (repo) =>
            repo.tables.length > 0 && (
              <li key={`repo-${repo.id}`} className='px-4 py-2'>
                <p className='border-t pt-2 font-normal'>{repo.name}</p>
                <ul className='list-item font-light'>
                  {repo.tables.map((table, i) => (
                    <li
                      key={`repo-${repo.id}-table-${i}`}
                      className='cursor-pointer px-2 pt-3 transition-colors hover:text-irmin_green'
                      onClick={() => selectDBTable(repo, table)}
                      aria-label={`Click to get the reference snippet for the table ${table} from ${repo.name}`}
                    >
                      {/** Only show part of the table name between first and last dots */}
                      {table.split('.').slice(1, -1).join('.')}
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

export default RepositoryTableReferenceList;
