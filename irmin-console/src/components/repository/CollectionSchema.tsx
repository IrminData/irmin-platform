import React, { useMemo } from 'react';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import { RepositoryCollection } from '@/types/core/Collection';
import { FileSchema } from '@/types/core/FileCollection';
import { FolderSchema } from '@/types/core/FolderCollection';
import { StreamSchema } from '@/types/core/StreamCollection';
import { TableSchema } from '@/types/core/TableCollection';

import Button from '../common/button/Button';
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
  const { dict, locale } = useLocale();

  const {
    workspaces: { currentWorkspace },
    workflows: { allWorkflows },
  } = useWorkspace();

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

  const matchedWorkflow = useMemo(
    () => allWorkflows.find((workflow) => workflow.id === collection.workflow),
    [allWorkflows, collection.workflow]
  );

  return (
    <div className='flex w-max min-w-72 flex-col overflow-scroll rounded-md border border-gray-100 bg-white text-xs dark:border-gray-800 dark:bg-irmin_black'>
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

        {matchedWorkflow && (
          <Button
            size='sm'
            colorScheme='light'
            variant='solid'
            className='w-full'
            href={`/${locale}/portal/${currentWorkspace?.slug}/workflows/${matchedWorkflow.slug}`}
          >
            {dict.repository.viewWorkflow}
          </Button>
        )}
      </div>
    </div>
  );
}
