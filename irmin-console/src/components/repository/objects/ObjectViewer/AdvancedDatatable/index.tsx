'use client';

import { memo, Suspense, useMemo } from 'react';

import dynamic from 'next/dynamic';

import type { Column } from '@sdziadkowiec/react-datasheet-grid';
import {
  checkboxColumn,
  floatColumn,
  intColumn,
  keyColumn,
  textColumn,
} from '@sdziadkowiec/react-datasheet-grid';
import '@sdziadkowiec/react-datasheet-grid/dist/style.css';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import deepEqual from '@/utils/deepEqual';

import type { TableRow } from '@/types/internal/Datatable';

const DataSheet = dynamic(() => import('./DataSheet'), {
  loading: () => <LoadingSkeleton />,
  ssr: false,
});

/**
 * Datatable component for displaying data in a table.
 *
 * Uses the `@sdziadkowiec/react-datasheet-grid` library using the `DataSheet` component.
 * This component is used to display a more advanced datatable.
 */
function AdvancedDatatable({ items }: { items: TableRow[] }) {
  const { locale } = useLocale();

  // Detect columns and their types (independent of locale)
  const { columns, columnsWithTypes } = useMemo(() => {
    if (items.length === 0) {
      return {
        columns: [] as Partial<Column<TableRow>>[],
        columnsWithTypes: {} as Record<
          string,
          'boolean' | 'date' | 'float' | 'int' | 'string'
        >,
      };
    }

    try {
      // Get all properties from the items to use as columns
      const allProperties = items
        .map((item) => Object.keys(item))
        .flat()
        .filter((value, index, self) => self.indexOf(value) === index);

      // Store the matched types of the columns
      const columnsWithTypes: {
        [key: string]: 'boolean' | 'date' | 'float' | 'int' | 'string';
      } = {};

      // Create columns from the properties
      // Note: We use @ts-expect-error because react-datasheet-grid's column types
      // are overly strict for our use case of mixed-type table rows. Each column
      // type (intColumn, floatColumn, etc.) is strongly typed, but our TableRow
      // has mixed types, causing type incompatibility at spread time.
      const newColumns = allProperties.map((key) => {
        // Get the first value of the key to determine the type
        const exampleValue = items.find((item) => item[key])?.[key];

        // Determine the type of the column
        if (typeof exampleValue === 'number') {
          if (Number.isInteger(exampleValue)) {
            columnsWithTypes[key] = 'int';
            // @ts-expect-error - intColumn type conflicts with mixed TableRow type
            return { ...keyColumn(key, intColumn), title: key };
          }
          columnsWithTypes[key] = 'float';
          // @ts-expect-error - floatColumn type conflicts with mixed TableRow type
          return { ...keyColumn(key, floatColumn), title: key };
        }
        if (typeof exampleValue === 'boolean') {
          columnsWithTypes[key] = 'boolean';
          // @ts-expect-error - checkboxColumn type conflicts with mixed TableRow type
          return { ...keyColumn(key, checkboxColumn), title: key };
        }
        if (
          typeof exampleValue === 'string' &&
          new Date(exampleValue).toString() !== 'Invalid Date'
        ) {
          columnsWithTypes[key] = 'date';
          // @ts-expect-error - textColumn type conflicts with mixed TableRow type
          return { ...keyColumn(key, textColumn), title: key };
        }
        // If nothing else matches, use text column
        columnsWithTypes[key] = 'string';
        // @ts-expect-error - textColumn type conflicts with mixed TableRow type
        return { ...keyColumn(key, textColumn), title: key };
      }) as Partial<Column<TableRow>>[];

      return { columns: newColumns, columnsWithTypes };
    } catch (error) {
      console.error('Error processing columns:', error);
      return { columns: [], columnsWithTypes: {} };
    }
  }, [items]);

  // Format data based on column types (locale-dependent)
  const renderItems = useMemo(() => {
    if (items.length === 0 || Object.keys(columnsWithTypes).length === 0) {
      return [];
    }

    try {
      // Make sure values in the data are matching the columns
      return items.map((item) => {
        const newItem: TableRow = { ...item };
        Object.keys(columnsWithTypes).forEach((key) => {
          try {
            if (!newItem[key]) {
              newItem[key] = '';
            }
            const type = columnsWithTypes[key];
            if (type === 'int') {
              newItem[key] = parseInt(newItem[key] as string);
            }
            if (type === 'float') {
              newItem[key] = parseFloat(newItem[key] as string);
            }
            if (type === 'boolean' && typeof newItem[key] !== 'boolean') {
              newItem[key] = newItem[key] === 'true';
            }
            if (type === 'date') {
              newItem[key] = new Date(newItem[key] as string).toLocaleString(
                locale
              );
            }
          } catch (e) {
            console.error(e);
          }
        });
        return newItem;
      });
    } catch (error) {
      console.error('Error formatting data:', error);
      return [];
    }
  }, [items, columnsWithTypes, locale]);

  if (!columns.length || !renderItems.length) {
    return (
      <div className='size-full'>
        <LoadingSkeleton className='h-96' />
      </div>
    );
  }

  return (
    <div
      className='size-full min-h-[500px] overflow-scroll'
      id='advanced-datatable'
    >
      <div className='relative size-full'>
        <div className='absolute size-full'>
          <Suspense fallback={<LoadingSkeleton />}>
            <DataSheet items={renderItems} columns={columns} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default memo(AdvancedDatatable, (prevProps, nextProps) => {
  // Use deep equality check to prevent unnecessary re-renders
  // when items array reference changes but contents are the same
  return deepEqual(prevProps.items, nextProps.items);
});
