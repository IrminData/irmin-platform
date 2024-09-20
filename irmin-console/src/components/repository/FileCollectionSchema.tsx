'use client';

import React from 'react';

import { TbDownload } from 'react-icons/tb';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import { FileSchema } from '@/types/internal/FileCollection';

/**
 * Component for displaying the schema for File collection.
 *
 * @param props - The component props
 * @param props.schema - The file collection to display
 */
export default function FileCollectionSchema({
  schema,
}: {
  schema: FileSchema;
}) {
  const { dict, locale } = useLocale();

  // Handle download file
  const handleDownload = () => {
    // TODO: Download the file from the server
  };

  return (
    <div className='flex flex-col gap-4'>
      <table className='border-seperate w-full table-auto gap-2 text-left'>
        <tbody>
          <tr className='gap-2 divide-x divide-gray-200 dark:divide-gray-700'>
            <td className='p-1 font-bold'>{dict.repository.schema.name}</td>
            <td className='p-1'>{schema.name}</td>
          </tr>
          <tr className='gap-2 divide-x divide-gray-200 dark:divide-gray-700'>
            <td className='p-1 font-bold'>{dict.repository.schema.size}</td>
            <td className='p-1'>
              {(schema.size / (1024 * 1024)).toFixed(3)} MB
            </td>
          </tr>
          <tr className='gap-2 divide-x divide-gray-200 dark:divide-gray-700'>
            <td className='p-1 font-bold'>
              {dict.repository.schema.extension}
            </td>
            <td className='p-1'>{schema.extension}</td>
          </tr>
          <tr className='gap-2 divide-x divide-gray-200 dark:divide-gray-700'>
            <td className='p-1 font-bold'>
              {dict.repository.schema.created_at}
            </td>
            <td className='p-1'>
              {new Date(schema.created_at).toLocaleString(locale)}
            </td>
          </tr>
          <tr className='gap-2 divide-x divide-gray-200 dark:divide-gray-700'>
            <td className='p-1 font-bold'>
              {dict.repository.schema.modified_at}
            </td>
            <td className='p-1'>
              {new Date(schema.modified_at).toLocaleString(locale)}
            </td>
          </tr>
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
