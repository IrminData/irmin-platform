import React, { ForwardedRef, forwardRef } from 'react';

import { Column, DataSheetGrid, DataSheetGridRef } from 'react-datasheet-grid';

import { CollectionRow } from '@/types/internal/Collection';

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
      items: CollectionRow[];
      columns: Partial<Column<CollectionRow>>[] | undefined;
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

export default DataSheet;
