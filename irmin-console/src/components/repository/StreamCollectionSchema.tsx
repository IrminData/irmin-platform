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
 * @param props.downloadUrl - (optional) The download URL for the object
 */
export default function StreamCollectionSchema({
  schema,
  downloadUrl,
}: {
  schema: StreamSchema;
  downloadUrl?: string;
}) {
  const { dict } = useLocale();

  return (
    <div className='space-y-4'>
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
      {downloadUrl && (
        <Button
          size='sm'
          colorScheme='light'
          variant='solid'
          className='w-full'
          icon={<TbDownload />}
          href={downloadUrl}
        >
          {dict.repository.download.download}
        </Button>
      )}
    </div>
  );
}
