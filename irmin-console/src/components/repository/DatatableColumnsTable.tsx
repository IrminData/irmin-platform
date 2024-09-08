'use client';

import React from 'react';

import { DatatableSchema } from '@/types/internal/Datatable';

/**
 * Component for displaying a table of columns from a database table schema.
 *
 * @param schema - The schema to display.
 */
export default function DatatableColumnsTable({
  schema,
}: {
  schema: DatatableSchema;
}) {
  return (
    <div className='overflow-scroll p-2 text-[8px]'>
      <p className='mb-2 text-xs text-irmin_blue dark:text-white'>
        {schema.table}
      </p>
      <table className='border-seperate w-full table-auto gap-2 text-left'>
        <thead className='border-b-2 border-gray-500 dark:border-gray-200'>
          <tr>
            <th className='p-1'>Column</th>
            <th className='p-1'>Type</th>
            <th className='p-1'>Constraints</th>
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
              <td className='p-1'>
                {column.isPrimaryKey ? 'PK ' : ''}
                {column.isUnique ? 'Unique ' : ''}
                {column.isNullable ? 'Nullable ' : ''}
                {column.foreignKey ? 'FK ' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
