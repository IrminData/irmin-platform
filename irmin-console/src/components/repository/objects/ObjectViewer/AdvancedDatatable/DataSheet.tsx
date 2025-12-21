'use client';

import type { ForwardedRef } from 'react';
import { forwardRef, memo, useEffect, useState } from 'react';

import type {
  Column,
  DataSheetGridRef,
} from '@sdziadkowiec/react-datasheet-grid';
import { DataSheetGrid } from '@sdziadkowiec/react-datasheet-grid';
import '@sdziadkowiec/react-datasheet-grid/dist/style.css';

import SafeComponent from '@/components/ui/error/SafeComponent';

import type { TableRow } from '@/types/internal/Datatable';

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      // Use requestAnimationFrame to defer the state update and avoid synchronous setState warnings
      // This is a common pattern to ensure the component is truly mounted before interaction
      const raf = requestAnimationFrame(() => {
        setMounted(true);
      });
      return () => {
        cancelAnimationFrame(raf);
        setMounted(false);
      };
    }, []);

    if (!mounted) {
      return null;
    }

    return (
      <SafeComponent
        key={`${items.length}-${columns?.length ?? 0}`}
        level='component'
        title='DataSheet Error'
        description='The DataSheet component encountered an error. Please try refreshing the page.'
      >
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
      </SafeComponent>
    );
  }
);

DataSheet.displayName = 'DataSheet';

export default memo(DataSheet);
