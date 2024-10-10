'use client';

import React from 'react';

import { TbDownload } from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { TableSchema } from '@/types/core/TableCollection';

/**
 * Component for displaying the schema for a table collection.
 *
 * @param props - The component props
 * @param props.schema - The table schema to display
 * @param props.downloadUrl - (optional) The download URL for the object
 */
export default function TableCollectionSchema({
  schema,
  downloadUrl,
}: {
  schema: TableSchema;
  downloadUrl?: string;
}) {
  const { dict } = useLocale();

  return (
    <div className='space-y-4'>
      <table className='border-seperate mb-4 w-full table-auto gap-2 text-left'>
        <thead>
          <tr className='border-b border-gray-300 dark:border-gray-700'>
            <th className='p-1'>{dict.repository.schema.column}</th>
            <th className='p-1'>{dict.repository.schema.type}</th>
          </tr>
        </thead>
        <tbody>
          {schema.columns.map((column) => (
            <tr key={column.name} className='gap-2'>
              <td className='p-1'>{column.name}</td>
              <td className='p-1'>{column.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {downloadUrl && (
        <Button
          size='sm'
          variant='secondary'
          className='w-full'
          icon={<TbDownload />}
          href={downloadUrl}
        >
          {dict.misc.download.download}
        </Button>
      )}
    </div>
  );
}
