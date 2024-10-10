'use client';

import React from 'react';

import { TbDownload } from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { FileSchema } from '@/types/core/FileCollection';

/**
 * Component for displaying the schema for File collection.
 *
 * @param props - The component props
 * @param props.schema - The file collection to display
 * @param props.downloadUrl - (optional) The download URL for the object
 */
export default function FileCollectionSchema({
  schema,
  downloadUrl,
}: {
  schema: FileSchema;
  downloadUrl?: string;
}) {
  const { dict, locale } = useLocale();

  return (
    <div className='flex w-full flex-col gap-4'>
      <table className='border-seperate w-full table-auto gap-2 text-left'>
        <tbody>
          <tr className='gap-2'>
            <td className='p-1 font-bold'>{dict.repository.schema.name}</td>
            <td className='p-1'>{schema.name}</td>
          </tr>
          <tr className='gap-2'>
            <td className='p-1 font-bold'>{dict.repository.schema.size}</td>
            <td className='p-1'>
              {(schema.size / (1024 * 1024)).toFixed(3)} MB
            </td>
          </tr>
          <tr className='gap-2'>
            <td className='p-1 font-bold'>
              {dict.repository.schema.created_at}
            </td>
            <td className='p-1'>
              {new Date(schema.created_at).toLocaleString(locale)}
            </td>
          </tr>
          <tr className='gap-2'>
            <td className='p-1 font-bold'>
              {dict.repository.schema.modified_at}
            </td>
            <td className='p-1'>
              {new Date(schema.modified_at).toLocaleString(locale)}
            </td>
          </tr>
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
