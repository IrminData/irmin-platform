'use client';

import React from 'react';

import { TbDownload } from 'react-icons/tb';

import Button from '@/components/common/button/Button';

import { useLocale } from '@/context/LocaleContext';

import { StreamSchema } from '@/types/core/StreamCollection';

/**
 * Component for displaying the schema for a stream collection.
 *
 * @param props - The component props
 * @param props.schema - The stream schema to display
 */
export default function StreamCollectionSchema({
  schema,
}: {
  schema: StreamSchema;
}) {
  const { dict } = useLocale();

  // Handle download stream
  const handleDownload = () => {
    // TODO: Download the item from the server
  };

  return (
    <div className='space-y-2'>
      <div className='flex gap-2 p-1'>
        <div className='w-20 font-bold'>
          {dict.repository.schema.streamType}
        </div>
        <div>
          {schema.isLive
            ? dict.repository.schema.live
            : dict.repository.schema.historical}
        </div>
      </div>
      <table className='border-seperate w-full table-auto gap-2 text-left'>
        <thead>
          <tr className='border-b border-gray-300 dark:border-gray-700'>
            <th className='p-1'>{dict.repository.schema.field}</th>
            <th className='p-1'>{dict.repository.schema.type}</th>
          </tr>
        </thead>
        <tbody>
          {schema.fields.map((field, index) => (
            <tr key={index} className='gap-2'>
              <td className='p-1'>{field.name}</td>
              <td className='p-1'>{field.type}</td>
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
