'use client';

import React from 'react';

import { TbDownload } from 'react-icons/tb';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import { TableSchema } from '@/types/internal/TableCollection';

/**
 * Component for displaying the schema for a table collection.
 *
 * @param props - The component props
 * @param props.schema - The table schema to display
 */
export default function TableCollectionSchema({
  schema,
}: {
  schema: TableSchema;
}) {
  const { dict } = useLocale();

  // Handle download table as CSV
  const handleDownload = () => {
    // TODO: Download the table as CSV from the server
  };

  return (
    <div className='space-y-2'>
      <table className='border-seperate w-full table-auto gap-2 text-left'>
        <thead>
          <tr className='border-b border-gray-300 dark:border-gray-700'>
            <th className='p-1'>{dict.repository.schema.column}</th>
            <th className='p-1'>{dict.repository.schema.type}</th>
          </tr>
        </thead>
        <tbody>
          {schema.columns.map((column) => (
            <tr
              key={column.name}
              className='gap-2 divide-x divide-gray-200 dark:divide-gray-700'
            >
              <td className='p-1'>{column.name}</td>
              <td className='p-1'>{column.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        onClick={handleDownload}
        className='w-full'
        colorScheme='black'
        variant='link'
        size='sm'
        icon={<TbDownload />}
      >
        {dict.repository.download}
      </Button>
    </div>
  );
}
