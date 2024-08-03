'use client;';

import { CiViewTable } from 'react-icons/ci';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

import { DataRepo } from '@/types/api/DataRepo';

/**
 * Data Table Selector component for selecting a Workspace DB table to display
 *
 * @param props0 - The props
 * @param props0.dataRepo - The data repository to display data for
 * @param props0.selectedTable - The currently selected table
 * @param props0.setSelectedTable - The function to set the selected table
 *
 * @returns The Data Repo Widgets component
 */
const DataTableSelector = ({
  dataRepo,
  selectedTable,
  setSelectedTable,
}: {
  dataRepo: DataRepo;
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;
}) => {
  const { dict } = useLocale();
  return (
    <div className='flex flex-col gap-2'>
      {dataRepo.tables.map((table, idx) => (
        <Button
          size='sm'
          colorScheme='gray'
          variant={selectedTable === table ? 'outline' : 'link'}
          className='h-auto min-h-6 w-full justify-start rounded px-0 py-0 pl-2 text-xs font-light shadow-none lg:min-h-6 lg:px-2 lg:text-xs'
          key={`${dataRepo.slug}-data-table-${idx}`}
          aria-label={`Select table ${table}`}
          onClick={() =>
            setSelectedTable(selectedTable === table ? null : table)
          }
          icon={<CiViewTable />}
        >
          {table}
        </Button>
      ))}
      {dataRepo.tables.length === 0 && (
        <p className='py-4 text-xs text-gray-400'>
          {dict.dataRepository.noDataTables}
        </p>
      )}
    </div>
  );
};

export default DataTableSelector;
