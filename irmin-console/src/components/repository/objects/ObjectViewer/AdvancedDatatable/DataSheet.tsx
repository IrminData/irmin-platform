import { ForwardedRef, forwardRef, memo } from 'react';

import { Column, DataSheetGrid, DataSheetGridRef } from 'react-datasheet-grid';

import 'react-datasheet-grid/dist/style.css';

import { TableRow } from '@/types/internal/Datatable';

/**
 * DataSheet component for displaying data in a table.
 * Separate from the AdvancedDatatable component to allow for improved rendering.
 */
const DataSheet = forwardRef(
  (
    {
      items,
      columns,
    }: {
      items: TableRow[];
      columns: Partial<Column<TableRow>>[] | undefined;
    },
    ref: ForwardedRef<DataSheetGridRef>
  ) => {
    return (
      <DataSheetGrid
        ref={ref}
        className='data-sheet-grid'
        value={items}
        columns={columns}
        addRowsComponent={false}
        autoAddRow={false}
        onChange={() => null}
        disableContextMenu
        disableExpandSelection
      />
    );
  }
);

DataSheet.displayName = 'DataSheet';

export default memo(DataSheet);
