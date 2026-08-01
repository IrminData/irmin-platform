'use client';

import { memo, useEffect, useState } from 'react';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useTheme } from 'next-themes';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import deepEqual from '@/utils/deepEqual';

import {
  DEFAULT_COL_DEF,
  PAGINATION_PAGE_SIZE,
  PAGINATION_PAGE_SIZE_SELECTOR,
  THEME_DARK,
  THEME_LIGHT,
} from './consts';
import type { AdvancedDatatableProps } from './types';
import { useColumnDefs } from './useColumnDefs';
import { useRowData } from './useRowData';

// Register modules globally (once)
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Datatable component for displaying data in a table using AG Grid.
 *
 * Replaces the previous implementation using `@sdziadkowiec/react-datasheet-grid`.
 */
function AdvancedDatatable({ items }: AdvancedDatatableProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by rendering only after mount
  useEffect(() => {
    // This triggers a re-render to ensure client-side only content (like AG Grid)
    // matches the hydration state. This is expected behavior.
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Detect columns and their types
  const { columnDefs, columnsWithTypes } = useColumnDefs(items);

  // Format data based on column types
  const rowData = useRowData(items, columnsWithTypes);

  if (!mounted || !columnDefs.length || !rowData.length) {
    return (
      <div className='size-full'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }

  // Select theme based on resolvedTheme
  const theme = resolvedTheme === 'dark' ? THEME_DARK : THEME_LIGHT;

  return (
    <div
      className='size-full min-h-[500px]'
      id='advanced-datatable'
      // AG Grid requires a container with explicit height
      style={{ height: '500px', width: '100%' }}
    >
      <div style={{ height: '100%', width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          pagination={true}
          paginationPageSize={PAGINATION_PAGE_SIZE}
          paginationPageSizeSelector={PAGINATION_PAGE_SIZE_SELECTOR}
          theme={theme}
        />
      </div>
    </div>
  );
}

export default memo(AdvancedDatatable, (prevProps, nextProps) => {
  // Use deep equality check to prevent unnecessary re-renders
  return deepEqual(prevProps.items, nextProps.items);
});
