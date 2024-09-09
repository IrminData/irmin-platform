'use client;';

import { CiViewTable } from 'react-icons/ci';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import { Repository } from '@/types/api/Repository';

/**
 * Data Table Selector component for selecting a Workspace DB table to display
 *
 * @param props0 - The props
 * @param props0.repository - The repository to display data for
 * @param props0.selectedTable - The currently selected table
 * @param props0.setSelectedTable - The function to set the selected table
 */
const TableSelector = ({
  repository,
  selectedTable,
  setSelectedTable,
}: {
  repository: Repository;
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;
}) => {
  const { dict } = useLocale();
  return (
    <div className='flex flex-col gap-2'>
      {repository.tables.map((table, idx) => (
        <Button
          size='sm'
          colorScheme='gray'
          variant={selectedTable === table ? 'outline' : 'link'}
          className='h-auto min-h-6 w-full justify-start rounded px-0 py-0 pl-2 text-xs font-normal shadow-none lg:min-h-6 lg:px-2 dark:text-gray-200'
          key={`${repository.slug}-data-table-${idx}`}
          aria-label={`Select table ${table}`}
          onClick={() =>
            setSelectedTable(selectedTable === table ? null : table)
          }
          icon={<CiViewTable />}
        >
          {/* Only show part of the table name between first and last dots */}
          {table.split('.').slice(1, -1).join('.')}
        </Button>
      ))}
      {repository.tables.length === 0 && (
        <p className='py-4 text-xs text-gray-400'>
          {dict.repository.noDataTables}
        </p>
      )}
    </div>
  );
};

export default TableSelector;
