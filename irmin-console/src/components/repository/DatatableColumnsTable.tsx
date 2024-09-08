'use client';

import React from 'react';

import { useLocale } from '@/context/LocaleContext';

import { DatatableSchema } from '@/types/internal/Datatable';

/**
 * Component for displaying a table of columns from a database table schema.
 *
 * @param schema - The schema to display.
 */
export default function DatatableColumnsTable({
  schema,
  hideConstraints = false,
}: {
  schema: DatatableSchema;
  hideConstraints?: boolean;
}) {
  const { dict } = useLocale();
  return (
    <div className='overflow-scroll p-2 text-[8px]'>
      <p className='mb-2 text-xs text-irmin_blue dark:text-white'>
        "{schema.table}" {dict.repository.schema.tableSchema}
      </p>
      <table className='border-seperate w-full table-auto gap-2 text-left'>
        <thead>
          <tr className='border-b border-gray-300 dark:border-gray-600'>
            <th className='p-1'>{dict.repository.schema.column}</th>
            <th className='p-1'>{dict.repository.schema.type}</th>
            {!hideConstraints && (
              <th className='p-1'>{dict.repository.schema.constraints}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {schema.columns.map((column) => (
            <tr
              key={column.name}
              className='gap-2 divide-x divide-gray-300 dark:divide-gray-600'
            >
              <td className='p-1'>{column.name}</td>
              <td className='p-1'>{column.type}</td>
              {!hideConstraints && (
                <td className='p-1'>
                  {column.isPrimaryKey ? 'PK ' : ''}
                  {column.isUnique ? 'Unique ' : ''}
                  {column.isNullable ? 'Nullable ' : ''}
                  {column.foreignKey ? 'FK ' : ''}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
