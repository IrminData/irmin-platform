'use client';

import React, { useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  checkboxColumn,
  Column,
  DataSheetGridRef,
  dateColumn,
  floatColumn,
  intColumn,
  keyColumn,
  textColumn,
} from 'react-datasheet-grid';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { TableRow } from '@/types/internal/TableCollection';

const DataSheet = dynamic(() => import('./DataSheet'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Advanced datatable component for displaying data in a table.
 *
 * Uses the `react-datasheet-grid` library {@link DataSheet}.
 * This component is used to display a more advanced datatable.
 */
export default function AdvancedDatatable({ items }: { items: TableRow[] }) {
  const dataSheetRef = useRef<DataSheetGridRef>(null);

  const [columns, setColumns] = useState<
    Partial<Column<TableRow>>[] | undefined
  >(undefined);

  // Create columns from the properties
  useEffect(() => {
    // Get all properties from the items to use as columns
    const allProperties = items
      .map((item) => Object.keys(item))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);

    // Create columns from the properties
    const newColumns = allProperties.map((key) => {
      // Get the first value of the key to determine the type
      const exampleValue = items.find((item) => item[key])?.[key];

      // Determine the type of the column
      if (typeof exampleValue === 'number') {
        if (Number.isInteger(exampleValue)) {
          return { ...keyColumn(key, intColumn), title: key };
        }
        return { ...keyColumn(key, floatColumn), title: key };
      }
      if (typeof exampleValue === 'boolean') {
        return { ...keyColumn(key, checkboxColumn), title: key };
      }
      if (
        typeof exampleValue === 'string' &&
        new Date(exampleValue).toString() !== 'Invalid Date'
      ) {
        return { ...keyColumn(key, dateColumn), title: key };
      }
      // If nothing else matches, use text column
      return { ...keyColumn(key, textColumn), title: key };
    });

    setColumns(newColumns);
  }, [items]);

  if (!columns || !items || columns.length === 0) return <LoadingSkeleton />;

  return (
    <div className='h-full w-full overflow-scroll' id='advanced-datatable'>
      <div className='relative h-full w-full'>
        <div className='absolute h-full w-full'>
          <DataSheet ref={dataSheetRef} items={items} columns={columns} />
        </div>
      </div>
    </div>
  );
}
