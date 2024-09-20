import React, { useMemo } from 'react';

import { useLocale } from '@/context/LocaleContext';

import { RepositoryCollection } from '@/types/api/Collection';
import { FileSchema } from '@/types/internal/FileCollection';
import { FolderSchema } from '@/types/internal/FolderCollection';
import { StreamSchema } from '@/types/internal/StreamCollection';
import { TableSchema } from '@/types/internal/TableCollection';

import FileCollectionSchema from './FileCollectionSchema';
import FolderCollectionSchema from './FolderCollectionSchema';
import StreamCollectionSchema from './StreamCollectionSchema';
import TableCollectionSchema from './TableCollectionSchema';

/**
 * Component for displaying the schema of a collection.
 *
 * @param props - The component props
 * @param props.collection - The collection to display the schema for
 */
export default function CollectionSchema({
  name,
  collection,
}: {
  name: string;
  collection: RepositoryCollection;
}) {
  const { dict } = useLocale();
  const typeScpecificLabel = useMemo(() => {
    if (collection.type === 'table') {
      return dict.repository.schema.table;
    }
    if (collection.type === 'folder') {
      return dict.repository.schema.folder;
    }
    if (collection.type === 'file') {
      return dict.repository.schema.file;
    }
    if (collection.type === 'stream') {
      return dict.repository.schema.stream;
    }
    return collection.type;
  }, [collection, dict]);
  return (
    <div className='overflow-scrollrounded-md flex w-max min-w-72 flex-col border border-gray-100 bg-white text-xs dark:border-gray-800 dark:bg-irmin_black'>
      <div className='bg-gray-100 px-4 py-2 text-sm font-semibold dark:bg-gray-800'>
        {typeScpecificLabel} {`"${name}"`}
      </div>
      <div className='p-2'>
        {collection.type === 'table' && (
          <TableCollectionSchema schema={collection.schema as TableSchema} />
        )}
        {collection.type === 'folder' && (
          <FolderCollectionSchema schema={collection.schema as FolderSchema} />
        )}
        {collection.type === 'file' && (
          <FileCollectionSchema schema={collection.schema as FileSchema} />
        )}
        {collection.type === 'stream' && (
          <StreamCollectionSchema schema={collection.schema as StreamSchema} />
        )}
      </div>
    </div>
  );
}
