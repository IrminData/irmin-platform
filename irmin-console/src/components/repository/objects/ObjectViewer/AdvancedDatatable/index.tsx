'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  checkboxColumn,
  Column,
  floatColumn,
  intColumn,
  keyColumn,
  textColumn,
} from 'react-datasheet-grid';

import 'react-datasheet-grid/dist/style.css';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { TableRow } from '@/types/internal/Datatable';

const DataSheet = dynamic(() => import('./DataSheet'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Datatable component for displaying data in a table.
 *
 * Uses the `react-datasheet-grid` library using the `DataSheet` component.
 * This component is used to display a more advanced datatable.
 */
export default function AdvancedDatatable({ items }: { items: TableRow[] }) {
  const { locale } = useLocale();

  const [renderItems, setRenderItems] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<
    Partial<Column<TableRow>>[] | undefined
  >(undefined);

  // Create columns and render items from the properties
  useEffect(() => {
    // Get all properties from the items to use as columns
    const allProperties = items
      .map((item) => Object.keys(item))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);

    // Store the matched types of the columns
    const columnsWithTypes: {
      [key: string]: 'string' | 'float' | 'int' | 'boolean' | 'date';
    } = {};

    // Create columns from the properties
    const newColumns = allProperties.map((key) => {
      // Get the first value of the key to determine the type
      const exampleValue = items.find((item) => item[key])?.[key];

      // Determine the type of the column
      if (typeof exampleValue === 'number') {
        if (Number.isInteger(exampleValue)) {
          columnsWithTypes[key] = 'int';
          return { ...keyColumn(key, intColumn), title: key };
        }
        columnsWithTypes[key] = 'float';
        return { ...keyColumn(key, floatColumn), title: key };
      }
      if (typeof exampleValue === 'boolean') {
        columnsWithTypes[key] = 'boolean';
        return { ...keyColumn(key, checkboxColumn), title: key };
      }
      if (
        typeof exampleValue === 'string' &&
        new Date(exampleValue).toString() !== 'Invalid Date'
      ) {
        columnsWithTypes[key] = 'date';
        return { ...keyColumn(key, textColumn), title: key };
      }
      // If nothing else matches, use text column
      columnsWithTypes[key] = 'string';
      return { ...keyColumn(key, textColumn), title: key };
    });

    // Make sure values in the data are matching the columns
    const newItems = items.map((item) => {
      const newItem: TableRow = { ...item };
      Object.keys(columnsWithTypes).map((key) => {
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

    setColumns(newColumns);
    setRenderItems(newItems);
  }, [items, locale]);

  if (!columns || !renderItems)
    return (
      <div className='h-full w-full'>
        <LoadingSkeleton className='h-96' />
      </div>
    );

  return (
    <div
      className='h-full min-h-[500px] w-full overflow-scroll'
      id='advanced-datatable'
    >
      <div className='relative h-full w-full'>
        <div className='absolute h-full w-full'>
          <DataSheet items={renderItems} columns={columns} />
        </div>
      </div>
    </div>
  );
}
