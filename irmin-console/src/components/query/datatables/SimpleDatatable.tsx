'use client';

import { useTheme } from 'next-themes';
import DataTable from 'react-data-table-component';

import { useLocale } from '@/context/LocaleContext';

import { TableRow } from '@/types/core/TableCollection';

/**
 * Simple datatable component for displaying data in a table.
 *
 * Uses the `react-data-table-component` library {@link DataTable}.
 *
 * @param params - The parameters for the component
 * @param params.items - The items to display in the table
 * @param params.handleRowsSelected - The function to call when rows are selected
 */
export default function SimpleDatatable({
  items,
  handleRowsSelected,
}: {
  items: TableRow[];
  handleRowsSelected: (selected: {
    allSelected: boolean;
    selectedCount: number;
    selectedRows: TableRow[];
  }) => void;
}) {
  const theme = useTheme();
  const { dict } = useLocale();

  // Get all properties from the items to use as columns
  const allProperties = items
    .map((item) => Object.keys(item))
    .flat()
    .filter((value, index, self) => self.indexOf(value) === index);

  // Create columns from the properties
  const columns = allProperties.map((key) => ({
    name: key,
    sortable: true,
    reorder: true,
    selector: (e: TableRow) =>
      typeof e[key] === 'boolean' ? (e[key] ? 'TRUE' : 'FALSE') : e[key],
  }));

  return (
    <div className='h-full w-full overflow-scroll' id='simple-datatable'>
      <div className='relative h-full w-full'>
        <div className='absolute h-full w-full'>
          <DataTable
            onSelectedRowsChange={handleRowsSelected}
            columns={columns}
            data={items}
            selectableRows
            pagination
            paginationPerPage={13}
            paginationComponentOptions={{
              rowsPerPageText: dict.query.rowsPerPage,
              rangeSeparatorText: dict.query.rangeSeparator,
              selectAllRowsItem: true,
              selectAllRowsItemText: dict.query.selectAllRows,
            }}
            persistTableHead
            theme={theme.theme === 'dark' ? 'dark' : 'default'}
            customStyles={{
              pagination: {
                style: {
                  justifyContent: 'flex-start',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
